import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifyMetrics from 'fastify-metrics';

const metricsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyMetrics, {
    endpoint: '/metrics',
    name: 'valet_backend',
    routeMetrics: {
      enabled: true,
      registeredRoutesOnly: true,
      groupStatusCodes: true,
    },
  });

  fastify.log.info('Prometheus metrics available at /metrics');
};

export default fp(metricsPlugin, {
  name: 'metrics',
});
