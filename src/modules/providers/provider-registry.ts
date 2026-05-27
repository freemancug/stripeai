import { env } from '../../config/env.js';
import type { RelayChatRequest, RelayChatResponse } from '../relay/relay.schema.js';

type ProviderName = RelayChatRequest['provider'];

type ProviderAdapter = {
  provider: ProviderName;
  supports(model: string): boolean;
  relay(request: RelayChatRequest): Promise<RelayChatResponse>;
};

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

const withTimeout = async (
  input: string,
  init: RequestInit,
  timeoutMs = 15_000
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
};

class OpenAIAdapter implements ProviderAdapter {
  provider: ProviderName = 'openai';

  supports(model: string) {
    return model.startsWith('gpt') || model.startsWith('o');
  }

  async relay(request: RelayChatRequest): Promise<RelayChatResponse> {
    const endpoint = `${env.OPENAI_BASE_URL}/chat/completions`;
    const inputTokens = estimateTokens(
      request.messages.map((message) => message.content).join(' ')
    );

    if (!env.OPENAI_API_KEY || env.RELAY_DEMO_MODE) {
      return {
        id: `demo-openai-${Date.now()}`,
        mode: 'demo',
        provider: 'openai',
        model: request.model,
        outputText: 'Demo relay response from OpenAI adapter.',
        usage: {
          inputTokens,
          outputTokens: 64
        },
        upstreamRequest: {
          endpoint,
          providerModel: request.model
        }
      };
    }

    const response = await withTimeout(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI relay failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      id: string;
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    return {
      id: payload.id,
      mode: 'live',
      provider: 'openai',
      model: request.model,
      outputText: payload.choices?.[0]?.message?.content ?? '',
      usage: {
        inputTokens: payload.usage?.prompt_tokens ?? inputTokens,
        outputTokens: payload.usage?.completion_tokens ?? 0
      },
      upstreamRequest: {
        endpoint,
        providerModel: request.model
      }
    };
  }
}

class AnthropicAdapter implements ProviderAdapter {
  provider: ProviderName = 'anthropic';

  supports(model: string) {
    return model.startsWith('claude');
  }

  async relay(request: RelayChatRequest): Promise<RelayChatResponse> {
    const endpoint = `${env.ANTHROPIC_BASE_URL}/v1/messages`;
    const inputTokens = estimateTokens(
      request.messages.map((message) => message.content).join(' ')
    );
    const systemPrompt = request.messages.find((message) => message.role === 'system')?.content;
    const userMessages = request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content
      }));

    if (!env.ANTHROPIC_API_KEY || env.RELAY_DEMO_MODE) {
      return {
        id: `demo-anthropic-${Date.now()}`,
        mode: 'demo',
        provider: 'anthropic',
        model: request.model,
        outputText: 'Demo relay response from Anthropic adapter.',
        usage: {
          inputTokens,
          outputTokens: 72
        },
        upstreamRequest: {
          endpoint,
          providerModel: request.model
        }
      };
    }

    const response = await withTimeout(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: request.model,
        system: systemPrompt,
        max_tokens: 1024,
        temperature: request.temperature,
        messages: userMessages
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic relay failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      id: string;
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    return {
      id: payload.id,
      mode: 'live',
      provider: 'anthropic',
      model: request.model,
      outputText: payload.content?.map((item) => item.text ?? '').join('') ?? '',
      usage: {
        inputTokens: payload.usage?.input_tokens ?? inputTokens,
        outputTokens: payload.usage?.output_tokens ?? 0
      },
      upstreamRequest: {
        endpoint,
        providerModel: request.model
      }
    };
  }
}

export class ProviderRegistry {
  private readonly adapters: ProviderAdapter[] = [new OpenAIAdapter(), new AnthropicAdapter()];

  resolve(provider: ProviderName, model: string): ProviderAdapter {
    const adapter = this.adapters.find(
      (candidate) => candidate.provider === provider && candidate.supports(model)
    );

    if (!adapter) {
      throw new Error(`Unsupported provider/model combination: ${provider}/${model}`);
    }

    return adapter;
  }

  list() {
    return [
      {
        provider: 'openai',
        models: ['gpt-4.1', 'gpt-4o-mini', 'o4-mini']
      },
      {
        provider: 'anthropic',
        models: ['claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest']
      }
    ];
  }
}
