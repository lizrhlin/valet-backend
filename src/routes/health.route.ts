import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const healthRoute: FastifyPluginAsync = async (fastify) => {
  // Liveness check
  fastify.get(
    '/live',
    {
      schema: {
        tags: ['health'],
        description: 'Liveness probe',
        response: {
          200: z.object({
            status: z.string(),
          }),
        },
      },
    },
    async () => {
      return { status: 'ok' };
    }
  );

  // Readiness check
  fastify.get(
    '/ready',
    {
      schema: {
        tags: ['health'],
        description: 'Readiness probe - checks DB connection',
        response: {
          200: z.object({
            status: z.string(),
            database: z.string(),
            timestamp: z.string(),
          }),
          503: z.object({
            status: z.string(),
            error: z.string(),
          }),
        },
      },
    },
    async (_request, reply) => {
      try {
        // Verifica conexão com o banco
        await fastify.prisma.$queryRaw`SELECT 1`;
        return {
          status: 'ok',
          database: 'connected',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        reply.code(503);
        return {
          status: 'error',
          error: error instanceof Error ? error.message : 'Database connection failed',
        };
      }
    }
  );
};

export default healthRoute;
