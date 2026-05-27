import Stripe from 'stripe';
import { env } from '../../config/env.js';
import type { CreateStripeCheckoutInput } from './payment.schema.js';

const toStripeMetadata = (metadata: Record<string, string>) =>
  Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value)]));

export class StripePaymentService {
  private readonly stripe = env.STRIPE_SECRET_KEY
    ? new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-04-30.basil'
      })
    : null;

  async createCheckoutSession(input: CreateStripeCheckoutInput) {
    const unitAmount = Math.round(input.amount * 100);

    if (!this.stripe) {
      const sessionId = `cs_demo_${Date.now()}`;

      return {
        mode: 'demo' as const,
        sessionId,
        checkoutUrl: `${env.APP_BASE_URL}/demo/stripe/${sessionId}`,
        currency: input.currency,
        amountTotal: unitAmount * input.quantity
      };
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail,
      currency: input.currency,
      line_items: [
        {
          quantity: input.quantity,
          price_data: {
            currency: input.currency,
            unit_amount: unitAmount,
            product_data: {
              name: input.productName
            }
          }
        }
      ],
      metadata: toStripeMetadata(input.metadata)
    });

    return {
      mode: 'live' as const,
      sessionId: session.id,
      checkoutUrl: session.url,
      currency: input.currency,
      amountTotal: session.amount_total
    };
  }
}
