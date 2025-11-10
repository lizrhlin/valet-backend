import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const loggerPlugin: FastifyPluginAsync = async (fastify) => {
  // Pino já está integrado ao Fastify por padrão
  // Apenas configuramos o logging no buildApp()
  fastify.log.info('Logger plugin initialized');
};

export default fp(loggerPlugin, {
  name: 'logger',
  dependencies: ['env'],
});
