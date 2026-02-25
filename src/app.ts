import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';

// Plugins
import envPlugin from './plugins/env.js';
import loggerPlugin from './plugins/logger.js';
import securityPlugin from './plugins/security.js';
import dbPlugin from './plugins/db.js';
import metricsPlugin from './plugins/metrics.js';

// Routes
import healthRoute from './routes/health.route.js';
import authRoute from './routes/auth.route.js';
import usersRoute from './routes/users.route.js';
import categoryRoute from './routes/category.route.js';
import professionalRoute from './routes/professional.route.js';
import appointmentRoute from './routes/appointment.route.js';
import addressRoute from './routes/address.route.js';
import favoriteRoute from './routes/favorite.route.js';
import reviewRoute from './routes/review.route.js';
import notificationRoute from './routes/notification.route.js';
import documentRoute from './routes/document.route.js';
import { registerUploadRoutes } from './routes/upload.route.js';

export async function buildApp() {
  const app = Fastify({
    logger:
      process.env.NODE_ENV !== 'production'
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            },
          }
        : true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
      },
    },
  }).withTypeProvider<ZodTypeProvider>();

  // Configurar validação com Zod
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Registrar plugins de infraestrutura
  await app.register(envPlugin);
  await app.register(loggerPlugin);
  await app.register(securityPlugin);
  await app.register(dbPlugin);
  await app.register(metricsPlugin);

  // JWT
  await app.register(fastifyJwt, {
    secret: app.config.JWT_SECRET,
    sign: {
      expiresIn: app.config.JWT_EXPIRES_IN,
    },
  });

  // Swagger/OpenAPI
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Valet Backend API',
        description: 'API documentation for Valet Backend',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Register multipart plugin for file uploads
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // Register static file serving for uploads
  const uploadsDir = path.join(process.cwd(), 'uploads');
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
  });

  // Registrar rotas
  await app.register(healthRoute, { prefix: '/health' });
  await app.register(authRoute, { prefix: '/auth' });
  await app.register(usersRoute, { prefix: '/users' });
  await app.register(categoryRoute, { prefix: '/api' });
  await app.register(professionalRoute, { prefix: '/api' });
  await app.register(appointmentRoute, { prefix: '/api' });
  await app.register(addressRoute, { prefix: '/api' });
  await app.register(favoriteRoute, { prefix: '/api' });
  await app.register(reviewRoute, { prefix: '/api' });
  await app.register(notificationRoute, { prefix: '/api' });
  await app.register(documentRoute, { prefix: '/api' });
  await app.register(registerUploadRoutes, { prefix: '/api' });

  return app;
}
