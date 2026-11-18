import { Router } from 'express';

const VALID_MODES = new Set([
  'normal',
  'slow',
  'malformed',
  'bad-price',
  'unauthorized',
  'rate-limited',
  'server-error',
  'html'
]);

export function createRoadRunnerMockRouter({
  apiKey,
  mode = 'normal',
  delayMs = 2500
}) {
  if (!VALID_MODES.has(mode)) {
    throw new Error(`Invalid ROAD_RUNNER_MOCK_MODE: ${mode}`);
  }

  const router = Router();
  router.post('/v1/estimate', async (req, res) => {
    if (req.get('X-Token') !== apiKey || !apiKey) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const { pickup, drop, grams } = req.body ?? {};
    if (
      typeof pickup !== 'string' ||
      !/^\d{6}$/.test(pickup) ||
      typeof drop !== 'string' ||
      !/^\d{6}$/.test(drop) ||
      !Number.isSafeInteger(grams) ||
      grams <= 0
    ) {
      return res.status(400).json({ ok: false, error: 'invalid_request' });
    }

    if (mode === 'unauthorized') {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    if (mode === 'rate-limited') {
      return res.status(429).json({ ok: false, error: 'rate_limited' });
    }
    if (mode === 'server-error') {
      return res.status(503).json({ ok: false, error: 'temporarily_unavailable' });
    }
    if (mode === 'html') {
      return res.type('html').send('<!doctype html><title>Carrier maintenance</title>');
    }
    if (mode === 'slow') {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    if (mode === 'malformed') {
      return res.json({
        ok: true,
        options: [{ tier: 'SAVER', price_inr: 89.5 }]
      });
    }
    if (mode === 'bad-price') {
      return res.json({
        ok: true,
        options: [{ tier: 'SAVER', price_inr: 89.555, days: '6-8' }]
      });
    }

    return res.json({
      ok: true,
      options: [
        { tier: 'SAVER', price_inr: 89.5, days: '6-8' },
        { tier: 'RUSH', price_inr: 210, days: '1-2' }
      ]
    });
  });

  return router;
}
