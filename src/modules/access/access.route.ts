import type { FastifyPluginAsync } from 'fastify';
import type { AccessControlService } from './access-control.service.js';

export const accessRoutes =
  (accessControlService: AccessControlService): FastifyPluginAsync =>
  async (app) => {
    app.get('/v1/auth/me', async (request, reply) => {
      const identity = accessControlService.getIdentity(request.id);
      if (!identity) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Unauthorized request.'
        });
      }

      return {
        workspaceId: identity.workspaceId,
        userId: identity.userId,
        apiKeyId: identity.apiKeyId,
        limits: {
          rpm: identity.rpmLimit,
          concurrency: identity.concurrencyLimit
        }
      };
    });
  };
