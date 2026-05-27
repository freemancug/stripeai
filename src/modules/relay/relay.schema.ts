import { z } from 'zod';

export const relayMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1)
});

export const relayChatRequestSchema = z.object({
  provider: z.enum(['openai', 'anthropic']),
  model: z.string().min(2),
  messages: z.array(relayMessageSchema).min(1),
  temperature: z.number().min(0).max(2).default(0.2),
  metadata: z.record(z.string(), z.string()).default({})
});

export type RelayChatRequest = z.infer<typeof relayChatRequestSchema>;

export type RelayChatResponse = {
  id: string;
  mode: 'demo' | 'live';
  provider: 'openai' | 'anthropic';
  model: string;
  outputText: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  upstreamRequest: {
    endpoint: string;
    providerModel: string;
  };
};
