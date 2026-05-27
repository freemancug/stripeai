import type { FastifyPluginAsync } from 'fastify';
import { relayChatRequestSchema } from './relay.schema.js';
import { RelayService } from './relay.service.js';

export const relayRoutes: FastifyPluginAsync = async (app) => {
  const relayService = new RelayService();

  app.get('/v1/providers', async () => ({
    providers: relayService.listProviders()
  }));

  app.post('/v1/relay/chat/completions', async (request, reply) => {
    const payload = relayChatRequestSchema.parse(request.body);
    const response = await relayService.relayChat(payload);

    return reply.send(response);
  });
};
