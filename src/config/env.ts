import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  RELAY_DEMO_MODE: z
    .string()
    .optional()
    .transform((value) => value !== 'false'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().url().default('https://api.anthropic.com'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STABLECOIN_TREASURY_ETH: z
    .string()
    .default('0x1111111111111111111111111111111111111111'),
  STABLECOIN_TREASURY_TRON: z.string().default('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'),
  STABLECOIN_TREASURY_SOL: z
    .string()
    .default('9xQeWvG816bUx9EPfEZxTg9P2nXVVh4vYXQqf6F4YyJt'),
  STABLECOIN_TREASURY_POLYGON: z
    .string()
    .default('0x2222222222222222222222222222222222222222'),
  STABLECOIN_TREASURY_BSC: z
    .string()
    .default('0x3333333333333333333333333333333333333333')
});

export const env = envSchema.parse(process.env);
