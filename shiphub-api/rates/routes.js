import { Router } from 'express';
import { HttpError } from '../HttpError.js';
import { CarrierError } from './carrier-error.js';
import { createRateService } from './rate-service.js';

const errorStatus = {
  timeout: 504,
  configuration: 503,
  connection: 502,
  server_error: 502,
  unauthorized: 502,
  rate_limited: 502,
  invalid_response: 502,
  http_error: 502
};

function parseRateRequest(query) {
  const { pickup, drop, grams } = query;
  if (
    typeof pickup !== 'string' ||
    !/^\d{6}$/.test(pickup) ||
    typeof drop !== 'string' ||
    !/^\d{6}$/.test(drop) ||
    typeof grams !== 'string' ||
    !/^[1-9]\d*$/.test(grams) ||
    !Number.isSafeInteger(Number(grams))
  ) {
    throw new HttpError(400, 'pickup and drop must be six-digit postal codes, and grams must be a positive integer');
  }
  return { pickup, drop, grams: Number(grams) };
}

export function createRatesRouter(adapters) {
  const router = Router();
  const rateService = createRateService(adapters);

  router.get('/', async (req, res) => {
    const request = parseRateRequest(req.query);
    try {
      const rates = await rateService.getRates(request);
      return res.json({ success: true, data: rates });
    } catch (error) {
      if (!(error instanceof CarrierError)) {
        throw error;
      }

      return res.status(errorStatus[error.reason] ?? 502).json({
        success: false,
        error: {
          carrier: 'Road Runner',
          reason: error.reason,
          message: error.message
        }
      });
    }
  });

  return router;
}
