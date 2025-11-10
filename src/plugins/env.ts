import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

export type Env = z.infer<typeof envSchema>;

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
  }
}

const envPlugin: FastifyPluginAsync = async (fastify) => {
  const config = envSchema.parse(process.env);
  fastify.decorate('config', config);
};

export default fp(envPlugin, {
  name: 'env',
});
