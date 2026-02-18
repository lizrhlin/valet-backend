import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';

const securityPlugin: FastifyPluginAsync = async (fastify) => {
  // Helmet - Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // CORS - Restrito
  await fastify.register(cors, {
    origin: fastify.config.NODE_ENV === 'production' 
      ? ['https://yourapp.com'] // Substituir pelo domínio real
      : true, // Permite qualquer origem em dev
    credentials: true,
  });

  // Rate Limiting - Mais permissivo em desenvolvimento
  await fastify.register(rateLimit, {
    max: fastify.config.NODE_ENV === 'production' ? 100 : 1000, // 1000 requisições em dev
    timeWindow: fastify.config.NODE_ENV === 'production' ? '15 minutes' : '1 minute', // 1 minuto em dev
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded, retry in 15 minutes',
    }),
  });

  // Limites de payload
  fastify.addHook('onRequest', async (request, reply) => {
    // Rotas de upload têm limite próprio (10MB via multipart plugin)
    if (request.url.startsWith('/api/uploads')) {
      return;
    }

    const maxPayloadSize = 1024 * 1024; // 1MB
    if (request.headers['content-length']) {
      const contentLength = parseInt(request.headers['content-length'], 10);
      if (contentLength > maxPayloadSize) {
        return reply.code(413).send({ error: 'Payload too large' });
      }
    }
  });
};

export default fp(securityPlugin, {
  name: 'security',
  dependencies: ['env'],
});
