import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { userResponseSchema, updateProfileSchema, UpdateProfileInput } from '../schemas/user.schema.js';
import { authenticate } from '../utils/auth.js';

const usersRoute: FastifyPluginAsync = async (fastify) => {
  // Get current user (authenticated)
  fastify.get(
    '/me',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['users'],
        description: 'Get current authenticated user',
        security: [{ bearerAuth: [] }],
        response: {
          200: userResponseSchema,
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
      const userId = request.user.userId;

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: { professionalProfile: true },
      });

      if (!user) {
        reply.code(404);
        return { error: 'User not found' };
      }

      // Remove password from response
      const { passwordHash, refreshTokenHash, resetPasswordToken, resetPasswordExpires, ...userWithoutSensitiveData } = user;
      
      return {
        ...userWithoutSensitiveData,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    }
  );

  // Update current user
  fastify.patch<{
    Body: UpdateProfileInput;
  }>(
    '/me',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['users'],
        description: 'Update current authenticated user',
        security: [{ bearerAuth: [] }],
        body: updateProfileSchema,
        response: {
          200: userResponseSchema,
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
      const userId = request.user.userId;

      try {
        const updatedUser = await fastify.prisma.user.update({
          where: { id: userId },
          data: request.body,
          include: { professionalProfile: true },
        });

        // Remove password from response
        const { passwordHash, refreshTokenHash, resetPasswordToken, resetPasswordExpires, ...userWithoutSensitiveData } = updatedUser;
        
        return {
          ...userWithoutSensitiveData,
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
        };
      } catch (error) {
        reply.code(400);
        return { error: error instanceof Error ? error.message : 'Update failed' };
      }
    }
  );
};

export default usersRoute;
