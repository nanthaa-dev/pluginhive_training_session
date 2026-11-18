import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoadRunnerAdapter } from '../rates/road-runner-adapter.js';

const config = {
  baseUrl: 'http://road-runner.test/',
  token: 'test-token',
  timeoutMs: 100
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

test('maps successful options to Rate values and sends the expected request', async () => {
  let request;
  const adapter = createRoadRunnerAdapter({
    ...config,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return jsonResponse({
        ok: true,
        options: [
          { tier: 'SAVER', price_inr: 89.5, days: '6-8' },
          { tier: 'RUSH', price_inr: 210, days: '1-2' }
        ]
      });
    }
  });

  const rates = await adapter.getRates({ pickup: '560001', drop: '682001', grams: 1500 });

  assert.equal(request.url, 'http://road-runner.test/road-runner/v1/estimate');
  assert.equal(request.options.headers['X-Token'], 'test-token');
  assert.deepEqual(JSON.parse(request.options.body), {
    pickup: '560001',
    drop: '682001',
    grams: 1500
  });
  assert.deepEqual(rates, [
    { carrier: 'Road Runner', tier: 'SAVER', pricePaise: 8950, minDays: 6, maxDays: 8 },
    { carrier: 'Road Runner', tier: 'RUSH', pricePaise: 21000, minDays: 1, maxDays: 2 }
  ]);
});

test('maps a wrong API key response to unauthorized', async () => {
  const adapter = createRoadRunnerAdapter({
    ...config,
    fetchImpl: async () => jsonResponse({ ok: false }, 401)
  });

  await assert.rejects(
    adapter.getRates({ pickup: '560001', drop: '682001', grams: 1500 }),
    (error) => error.reason === 'unauthorized'
  );
});

test('rejects prices with more than two decimal places', async () => {
  const adapter = createRoadRunnerAdapter({
    ...config,
    fetchImpl: async () => jsonResponse({
      ok: true,
      options: [{ tier: 'SAVER', price_inr: 89.555, days: '6-8' }]
    })
  });

  await assert.rejects(
    adapter.getRates({ pickup: '560001', drop: '682001', grams: 1500 }),
    (error) => error.reason === 'invalid_response' && /decimal places/.test(error.message)
  );
});

test('maps an aborted request to timeout', async () => {
  const adapter = createRoadRunnerAdapter({
    ...config,
    timeoutMs: 10,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    })
  });

  await assert.rejects(
    adapter.getRates({ pickup: '560001', drop: '682001', grams: 1500 }),
    (error) => error.reason === 'timeout'
  );
});

test('rejects an option missing delivery days', async () => {
  const adapter = createRoadRunnerAdapter({
    ...config,
    fetchImpl: async () => jsonResponse({
      ok: true,
      options: [{ tier: 'SAVER', price_inr: 89.5 }]
    })
  });

  await assert.rejects(
    adapter.getRates({ pickup: '560001', drop: '682001', grams: 1500 }),
    (error) => error.reason === 'invalid_response'
  );
});

test('maps HTML from the carrier to invalid_response', async () => {
  const adapter = createRoadRunnerAdapter({
    ...config,
    fetchImpl: async () => new Response('<html>maintenance</html>', {
      headers: { 'Content-Type': 'text/html' }
    })
  });

  await assert.rejects(
    adapter.getRates({ pickup: '560001', drop: '682001', grams: 1500 }),
    (error) => error.reason === 'invalid_response'
  );
});

test('maps carrier rate limiting to rate_limited', async () => {
  const adapter = createRoadRunnerAdapter({
    ...config,
    fetchImpl: async () => jsonResponse({ ok: false }, 429)
  });

  await assert.rejects(
    adapter.getRates({ pickup: '560001', drop: '682001', grams: 1500 }),
    (error) => error.reason === 'rate_limited'
  );
});
