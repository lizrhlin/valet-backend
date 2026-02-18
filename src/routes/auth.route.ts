import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { registerSchema, loginSchema, authResponseSchema, RegisterInput, LoginInput } from '../schemas/user.schema.js';
import { register, login } from '../services/auth.service.js';
import { hashRefreshToken, verifyRefreshTokenHash } from '../utils/auth.js';

const authRoute: FastifyPluginAsync = async (fastify) => {
  // Registro
  fastify.post<{
    Body: RegisterInput;
  }>(
    '/register',
    {
      schema: {
        tags: ['auth'],
        description: 'Register a new user',
        body: registerSchema,
        response: {
          201: authResponseSchema,
          400: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await register(fastify.prisma, request.body);
        const accessToken = fastify.jwt.sign({ userId: result.user.id });
        const refreshToken = fastify.jwt.sign({ userId: result.user.id }, { expiresIn: '30d' });

        // Salvar HASH do refresh token (nunca o token puro)
        const refreshTokenHash = hashRefreshToken(refreshToken);
        await fastify.prisma.user.update({
          where: { id: result.user.id },
          data: { refreshTokenHash },
        });

        reply.code(201);
        return { ...result, accessToken, refreshToken, expiresIn: 604800 }; // 7 dias em segundos
      } catch (error) {
        reply.code(400);
        return { error: error instanceof Error ? error.message : 'Registration failed' };
      }
    }
  );

  // Login
  fastify.post<{
    Body: LoginInput;
  }>(
    '/login',
    {
      schema: {
        tags: ['auth'],
        description: 'Login with email and password',
        body: loginSchema,
        response: {
          200: authResponseSchema,
          401: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await login(fastify.prisma, request.body);
        const accessToken = fastify.jwt.sign({ userId: result.user.id });
        const refreshToken = fastify.jwt.sign({ userId: result.user.id }, { expiresIn: '30d' });

        // Salvar HASH do refresh token (nunca o token puro)
        const refreshTokenHash = hashRefreshToken(refreshToken);
        await fastify.prisma.user.update({
          where: { id: result.user.id },
          data: { refreshTokenHash },
        });

        return { ...result, accessToken, refreshToken, expiresIn: 604800 }; // 7 dias em segundos
      } catch (error) {
        reply.code(401);
        return { error: error instanceof Error ? error.message : 'Login failed' };
      }
    }
  );

  // Refresh Token
  fastify.post<{
    Body: { refreshToken: string };
  }>(
    '/refresh',
    {
      schema: {
        tags: ['auth'],
        description: 'Refresh access token',
        body: z.object({
          refreshToken: z.string(),
        }),
        response: {
          200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
          }),
          401: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        // Verificar refresh token JWT
        const decoded = fastify.jwt.verify<{ userId: string }>(request.body.refreshToken);
        
        // Buscar usuário
        const user = await fastify.prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        // Verificar se o hash do token corresponde ao armazenado
        if (!user || !user.refreshTokenHash || !verifyRefreshTokenHash(request.body.refreshToken, user.refreshTokenHash)) {
          reply.code(401);
          return { error: 'Invalid refresh token' };
        }

        // Gerar novos tokens
        const accessToken = fastify.jwt.sign({ userId: user.id });
        const newRefreshToken = fastify.jwt.sign({ userId: user.id }, { expiresIn: '30d' });

        // Atualizar HASH do refresh token no banco
        const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
        await fastify.prisma.user.update({
          where: { id: user.id },
          data: { refreshTokenHash: newRefreshTokenHash },
        });

        return { accessToken, refreshToken: newRefreshToken };
      } catch (error) {
        reply.code(401);
        return { error: 'Invalid refresh token' };
      }
    }
  );

  // Logout
  fastify.post(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        description: 'Logout user',
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({
            message: z.string(),
          }),
          401: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const userId = request.user.userId;

        // Remover hash do refresh token
        await fastify.prisma.user.update({
          where: { id: userId },
          data: { refreshTokenHash: null },
        });

        return { message: 'Logged out successfully' };
      } catch (error) {
        reply.code(401);
        return { error: 'Unauthorized' };
      }
    }
  );

  // Completar registro de profissional
  fastify.post(
    '/complete-professional-registration',
    {
      schema: {
        tags: ['auth'],
        description: 'Complete professional registration with services and details',
        security: [{ bearerAuth: [] }],
        body: z.object({
          primaryCategoryId: z.number().int().positive().optional(),
          experienceRange: z.string().min(1, 'Experiência é obrigatória'),
          description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
          // Compatibilidade legada
          specialty: z.string().optional(),
          experience: z.string().optional(),
          // Geolocalização obrigatória
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          serviceRadiusKm: z.number().positive().optional().default(10),
          services: z.array(z.object({
            subcategoryId: z.number().int().positive('ID da subcategoria inválido'),
            price: z.string().min(1, 'Preço é obrigatório'), // Formato: "150,00"
          })).min(1, 'Selecione pelo menos um serviço'),
        }).refine((data) => data.primaryCategoryId || data.specialty, {
          message: 'Selecione uma especialidade principal',
          path: ['primaryCategoryId'],
        }),
        response: {
          200: z.object({
            message: z.string(),
            user: z.any(),
          }),
          400: z.object({
            error: z.string(),
          }),
          401: z.object({
            error: z.string(),
          }),
          404: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const userId = request.user.userId;
        const body = request.body as {
          primaryCategoryId?: number;
          experienceRange?: string;
          description: string;
          specialty?: string;
          experience?: string;
          latitude: number;
          longitude: number;
          serviceRadiusKm?: number;
          services: Array<{ subcategoryId: number; price: string }>;
        };
        const { primaryCategoryId, experienceRange, description, specialty, experience, latitude, longitude, serviceRadiusKm, services } = body;

        // Verificar se o usuário existe e é profissional
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          reply.code(404);
          return { error: 'User not found' };
        }

        if (user.userType !== 'PROFESSIONAL') {
          reply.code(400);
          return { error: 'User is not a professional' };
        }

        let resolvedPrimaryCategoryId = primaryCategoryId;
        if (!resolvedPrimaryCategoryId && specialty) {
          const category = await fastify.prisma.category.findFirst({
            where: { name: { equals: specialty, mode: 'insensitive' } },
            select: { id: true },
          });
          resolvedPrimaryCategoryId = category?.id;
        }

        const resolvedExperienceRange = experienceRange || experience || null;

        // Atualizar dados do profissional (perfil)
        await fastify.prisma.professionalProfile.upsert({
          where: { userId },
          update: {
            primaryCategoryId: resolvedPrimaryCategoryId,
            experienceRange: resolvedExperienceRange,
            description,
            latitude,
            longitude,
            serviceRadiusKm: serviceRadiusKm ?? 10,
          },
          create: {
            userId,
            primaryCategoryId: resolvedPrimaryCategoryId,
            experienceRange: resolvedExperienceRange,
            description,
            latitude,
            longitude,
            serviceRadiusKm: serviceRadiusKm ?? 10,
            isAvailable: false,
            isVerified: false,
          },
        });

        // Ativar usuário após completar registro
        await fastify.prisma.user.update({
          where: { id: userId },
          data: { status: 'ACTIVE' },
        });

        // Extrair categorias únicas dos serviços
        const subcategoryIds = services.map(s => s.subcategoryId);
        const subcategories = await fastify.prisma.subcategory.findMany({
          where: { id: { in: subcategoryIds } },
          select: { id: true, categoryId: true },
        });

        const uniqueCategoryIds = [...new Set(subcategories.map(s => s.categoryId))];

        // Criar relacionamentos com categorias
        await fastify.prisma.professionalCategory.createMany({
          data: uniqueCategoryIds.map(categoryId => ({
            professionalId: userId,
            categoryId,
          })),
          skipDuplicates: true,
        });

        // Criar relacionamentos com subcategorias e preços
        for (const service of services) {
          // Converter preço de "150,00" para 150.00
          const priceFloat = parseFloat(service.price.replace(',', '.'));

          await fastify.prisma.professionalSubcategory.upsert({
            where: {
              professionalId_subcategoryId: {
                professionalId: userId,
                subcategoryId: service.subcategoryId,
              },
            },
            update: {
              priceCents: priceFloat,
              isActive: true,
            },
            create: {
              professionalId: userId,
              subcategoryId: service.subcategoryId,
              priceCents: priceFloat,
              isActive: true,
            },
          });
        }

        // Buscar usuário atualizado com relacionamentos
        const userWithServices = await fastify.prisma.user.findUnique({
          where: { id: userId },
          include: {
            professionalProfile: true,
            categories: {
              include: {
                category: true,
              },
            },
            subcategories: {
              include: {
                subcategory: true,
              },
            },
          },
        });

        // Remover senha do retorno
        const { passwordHash: _, refreshTokenHash, resetPasswordToken, resetPasswordExpires, ...userWithoutPassword } = userWithServices!;

        return {
          message: 'Professional registration completed successfully',
          user: userWithoutPassword,
        };
      } catch (error) {
        reply.code(400);
        return { error: error instanceof Error ? error.message : 'Failed to complete registration' };
      }
    }
  );
};

export default authRoute;
