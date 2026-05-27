import { after } from 'node:test';
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';

const app = buildApp();

after(async () => {
  await app.close();
});

test('GET /health returns service status', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/health'
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, 'ok');
});

test('POST /v1/payments/stablecoin/invoices returns a quote', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/payments/stablecoin/invoices',
    payload: {
      asset: 'usdc',
      chain: 'solana',
      amountUsd: 29,
      orderId: 'order_123',
      metadata: {
        workspaceId: 'team_001'
      }
    }
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.json().asset, 'usdc');
  assert.equal(response.json().chain, 'solana');
});

test('POST /v1/relay/chat/completions returns a normalized relay response', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/relay/chat/completions',
    payload: {
      provider: 'openai',
      model: 'gpt-4.1',
      messages: [
        {
          role: 'user',
          content: '介绍一下这个项目'
        }
      ]
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().provider, 'openai');
  assert.equal(response.json().mode, 'demo');
});
