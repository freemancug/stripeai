import { z } from 'zod';

export const supportedStripeCurrencies = [
  'usd',
  'eur',
  'gbp',
  'jpy',
  'aud',
  'cad',
  'hkd',
  'sgd'
] as const;

export const supportedStablecoinAssets = ['usdt', 'usdc'] as const;
export const supportedStablecoinChains = [
  'ethereum',
  'tron',
  'solana',
  'polygon',
  'bsc'
] as const;

export const createStripeCheckoutSchema = z.object({
  productName: z.string().min(2),
  amount: z.number().positive(),
  currency: z.enum(supportedStripeCurrencies),
  quantity: z.number().int().positive().default(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  customerEmail: z.string().email().optional(),
  metadata: z.record(z.string(), z.string()).default({})
});

export const createStablecoinInvoiceSchema = z.object({
  asset: z.enum(supportedStablecoinAssets),
  chain: z.enum(supportedStablecoinChains),
  amountUsd: z.number().positive(),
  orderId: z.string().min(2),
  customerEmail: z.string().email().optional(),
  expiresInMinutes: z.number().int().min(5).max(120).default(30),
  metadata: z.record(z.string(), z.string()).default({})
});

export type CreateStripeCheckoutInput = z.infer<typeof createStripeCheckoutSchema>;
export type CreateStablecoinInvoiceInput = z.infer<typeof createStablecoinInvoiceSchema>;
