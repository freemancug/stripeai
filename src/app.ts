import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { healthRoutes } from './modules/health/health.route.js';
import { relayRoutes } from './modules/relay/relay.route.js';
import { paymentRoutes } from './modules/payments/payment.route.js';

export const buildApp = () => {
  const app = Fastify({
    logger: false
  });

  app.register(cors, {
    origin: true
  });
  app.register(sensible);
  app.register(healthRoutes);
  app.register(relayRoutes);
  app.register(paymentRoutes);

  app.setErrorHandler((error, _request, reply) => {
    const normalizedError =
      error instanceof Error ? error : new Error('Unexpected application error');
    const statusCode =
      typeof (error as { statusCode?: number }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 400;

    reply.status(statusCode).send({
      error: normalizedError.name,
      message: normalizedError.message
    });
  });

  return app;
};
