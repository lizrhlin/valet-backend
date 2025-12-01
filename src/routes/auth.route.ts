import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { registerSchema, loginSchema, authResponseSchema, RegisterInput, LoginInput } from '../schemas/user.schema.js';
import { register, login } from '../services/auth.service.js';

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

        // Salvar refresh token
        await fastify.prisma.user.update({
          where: { id: result.user.id },
          data: { refreshToken },
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

        // Salvar refresh token
        await fastify.prisma.user.update({
          where: { id: result.user.id },
          data: { refreshToken },
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
        // Verificar refresh token
        const decoded = fastify.jwt.verify<{ userId: string }>(request.body.refreshToken);
        
        // Buscar usuário
        const user = await fastify.prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user || user.refreshToken !== request.body.refreshToken) {
          reply.code(401);
          return { error: 'Invalid refresh token' };
        }

        // Gerar novos tokens
        const accessToken = fastify.jwt.sign({ userId: user.id });
        const newRefreshToken = fastify.jwt.sign({ userId: user.id }, { expiresIn: '30d' });

        // Atualizar refresh token no banco
        await fastify.prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: newRefreshToken },
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

        // Remover refresh token
        await fastify.prisma.user.update({
          where: { id: userId },
          data: { refreshToken: null },
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
          specialty: z.string().min(3, 'Especialização deve ter no mínimo 3 caracteres'),
          description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
          experience: z.string().min(3, 'Experiência é obrigatória'),
          location: z.string().min(3, 'Localização é obrigatória'),
          services: z.array(z.object({
            subcategoryId: z.number().int().positive('ID da subcategoria inválido'),
            price: z.string().min(1, 'Preço é obrigatório'), // Formato: "150,00"
          })).min(1, 'Selecione pelo menos um serviço'),
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
        },
      },
    },
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const userId = request.user.userId;

        const { specialty, description, experience, location, services } = request.body;

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

        // Atualizar dados do profissional
        const updatedUser = await fastify.prisma.user.update({
          where: { id: userId },
          data: {
            specialty,
            description,
            experience,
            location,
            status: 'ACTIVE', // Ativar após completar registro
          },
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
              price: priceFloat,
              isActive: true,
            },
            create: {
              professionalId: userId,
              subcategoryId: service.subcategoryId,
              price: priceFloat,
              isActive: true,
            },
          });
        }

        // Buscar usuário atualizado com relacionamentos
        const userWithServices = await fastify.prisma.user.findUnique({
          where: { id: userId },
          include: {
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
        const { password: _, ...userWithoutPassword } = userWithServices!;

        return {
          message: 'Professional registration completed successfully',
          user: userWithoutPassword,
        };
      } catch (error) {
        console.error('Error completing professional registration:', error);
        reply.code(400);
        return { error: error instanceof Error ? error.message : 'Failed to complete registration' };
      }
    }
  );
};

export default authRoute;
