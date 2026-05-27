import type { FastifyPluginAsync } from 'fastify';
import {
  createStablecoinInvoiceSchema,
  createStripeCheckoutSchema,
  supportedStripeCurrencies
} from './payment.schema.js';
import { StablecoinPaymentService } from './stablecoin.service.js';
import { StripePaymentService } from './stripe.service.js';

export const paymentRoutes: FastifyPluginAsync = async (app) => {
  const stripePaymentService = new StripePaymentService();
  const stablecoinPaymentService = new StablecoinPaymentService();

  app.get('/v1/payments/capabilities', async () => ({
    stripeCurrencies: supportedStripeCurrencies,
    stablecoinNetworks: stablecoinPaymentService.listCapabilities()
  }));

  app.post('/v1/payments/stripe/checkout-sessions', async (request, reply) => {
    const payload = createStripeCheckoutSchema.parse(request.body);
    const response = await stripePaymentService.createCheckoutSession(payload);

    return reply.code(201).send(response);
  });

  app.post('/v1/payments/stablecoin/invoices', async (request, reply) => {
    const payload = createStablecoinInvoiceSchema.parse(request.body);
    const response = stablecoinPaymentService.createInvoice(payload);

    return reply.code(201).send(response);
  });
};
