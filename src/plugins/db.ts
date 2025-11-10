import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  // Criar Prisma Client
  const prisma = new PrismaClient({
    log:
      fastify.config.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

  // Testar conexão
  await prisma.$connect();
  fastify.log.info('✅ Database connected');

  // Decorar a instância do Fastify
  fastify.decorate('prisma', prisma);

  // Fechar conexão ao encerrar
  fastify.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
    fastify.log.info('Database disconnected');
  });
};

export default fp(dbPlugin, {
  name: 'db',
  dependencies: ['env'],
});
