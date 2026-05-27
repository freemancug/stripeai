import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { env } from './config/env.js';
import { healthRoutes } from './modules/health/health.route.js';
import { accessRoutes } from './modules/access/access.route.js';
import { AccessControlService } from './modules/access/access-control.service.js';
import { relayRoutes } from './modules/relay/relay.route.js';
import { paymentRoutes } from './modules/payments/payment.route.js';

export const buildApp = () => {
  const accessControlService = new AccessControlService({
    tenantApiKeysConfig: env.TENANT_API_KEYS,
    defaultRpmLimit: env.DEFAULT_TENANT_RPM_LIMIT,
    defaultConcurrencyLimit: env.DEFAULT_TENANT_CONCURRENCY_LIMIT
  });

  const app = Fastify({
    logger: false
  });

  app.register(cors, {
    origin: true
  });
  app.register(rateLimit, {
    global: true,
    hook: 'preHandler',
    max: env.DEFAULT_TENANT_RPM_LIMIT,
    timeWindow: '1 minute',
    allowList: (request) => !request.raw.url?.startsWith('/v1/'),
    keyGenerator: (request) => request.headers.authorization ?? request.ip
  });
  app.register(sensible);

  app.addHook('preHandler', async (request, reply) => {
    if (!request.raw.url?.startsWith('/v1/')) {
      return;
    }

    if (!env.AUTH_REQUIRED) {
      return;
    }

    const auth = accessControlService.authenticate(request.id, request.headers.authorization);
    if (!auth.ok) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: auth.message
      });
    }

    const result = accessControlService.acquireIsolation(request.id);
    if (!result.ok) {
      return reply.code(429).send({
        error: 'RateLimited',
        message: result.message
      });
    }
  });

  app.addHook('onResponse', async (request) => {
    accessControlService.release(request.id);
  });

  app.register(healthRoutes);
  app.register(accessRoutes(accessControlService));
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
