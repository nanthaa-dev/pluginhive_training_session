import { CarrierError } from './carrier-error.js';
import { requestCarrierJson } from './carrier-boundary.js';

const ENDPOINT_PATH = '/road-runner/v1/estimate';

function priceToPaise(price) {
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    throw new CarrierError('invalid_response', 'Road Runner returned an invalid price');
  }

  const decimal = String(price);
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(decimal);
  if (!match) {
    throw new CarrierError('invalid_response', 'Road Runner price must have at most two decimal places');
  }

  const paise = BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0') || '0');
  if (paise > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new CarrierError('invalid_response', 'Road Runner price exceeds the supported range');
  }
  return Number(paise);
}

function parseDays(days) {
  if (typeof days !== 'string') {
    throw new CarrierError('invalid_response', 'Road Runner returned invalid delivery days');
  }

  const match = /^(\d+)-(\d+)$/.exec(days);
  if (!match) {
    throw new CarrierError('invalid_response', 'Road Runner delivery days must use min-max format');
  }

  const minDays = Number(match[1]);
  const maxDays = Number(match[2]);
  if (
    !Number.isSafeInteger(minDays) ||
    !Number.isSafeInteger(maxDays) ||
    minDays > maxDays
  ) {
    throw new CarrierError('invalid_response', 'Road Runner returned an invalid delivery range');
  }
  return { minDays, maxDays };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function createRoadRunnerAdapter({
  baseUrl,
  token,
  timeoutMs,
  fetchImpl
}) {
  return {
    async getRates({ pickup, drop, grams }) {
      const payload = await requestCarrierJson({
        url: `${baseUrl.replace(/\/+$/, '')}${ENDPOINT_PATH}`,
        token,
        body: { pickup, drop, grams },
        timeoutMs,
        fetchImpl
      });

      if (!isRecord(payload) || payload.ok !== true || !Array.isArray(payload.options)) {
        throw new CarrierError('invalid_response', 'Road Runner response is missing required fields');
      }

      return payload.options.map((option) => {
        if (
          !isRecord(option) ||
          typeof option.tier !== 'string' ||
          option.tier.trim() === ''
        ) {
          throw new CarrierError('invalid_response', 'Road Runner option has an invalid tier');
        }

        const pricePaise = priceToPaise(option.price_inr);
        const { minDays, maxDays } = parseDays(option.days);
        return {
          carrier: 'Road Runner',
          tier: option.tier,
          pricePaise,
          minDays,
          maxDays
        };
      });
    }
  };
}
