import { env } from '../../config/env.js';
import type { CreateStablecoinInvoiceInput } from './payment.schema.js';

const treasuryWallets = {
  ethereum: env.STABLECOIN_TREASURY_ETH,
  tron: env.STABLECOIN_TREASURY_TRON,
  solana: env.STABLECOIN_TREASURY_SOL,
  polygon: env.STABLECOIN_TREASURY_POLYGON,
  bsc: env.STABLECOIN_TREASURY_BSC
} as const;

const supportedAssetsByChain = {
  ethereum: ['usdt', 'usdc'],
  tron: ['usdt', 'usdc'],
  solana: ['usdc'],
  polygon: ['usdt', 'usdc'],
  bsc: ['usdt', 'usdc']
} as const;

const networkFeeHints = {
  ethereum: 'High',
  tron: 'Low',
  solana: 'Very low',
  polygon: 'Low',
  bsc: 'Low'
} as const;

export class StablecoinPaymentService {
  createInvoice(input: CreateStablecoinInvoiceInput) {
    const supportedAssets = supportedAssetsByChain[input.chain];

    if (!supportedAssets.includes(input.asset)) {
      throw new Error(`${input.asset} is not supported on ${input.chain}`);
    }

    const platformFeeUsd = Number(Math.max(input.amountUsd * 0.01, 0.5).toFixed(2));
    const totalDue = Number((input.amountUsd + platformFeeUsd).toFixed(2));
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + input.expiresInMinutes * 60_000);

    return {
      mode: 'quote',
      invoiceId: `stable_${Date.now()}`,
      orderId: input.orderId,
      asset: input.asset,
      chain: input.chain,
      settlementCurrency: 'usd',
      amountUsd: input.amountUsd,
      platformFeeUsd,
      totalDue,
      paymentAddress: treasuryWallets[input.chain],
      networkFeeHint: networkFeeHints[input.chain],
      confirmationsRequired: input.chain === 'tron' ? 10 : 12,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      metadata: input.metadata
    };
  }

  listCapabilities() {
    return Object.entries(supportedAssetsByChain).map(([chain, assets]) => ({
      chain,
      assets
    }));
  }
}
