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
};

export default authRoute;
