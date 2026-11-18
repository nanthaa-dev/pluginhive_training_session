const portValue = process.env.PORT ?? '3000';
const PORT = Number(portValue);

if (
  !Number.isInteger(PORT) ||
  PORT < 1 ||
  PORT > 65535
) {
  throw new Error(`Invalid PORT: ${portValue}`);
}

const allowedLogLevels = ['debug', 'info', 'warn', 'error'];
const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info').toLowerCase();

if (!allowedLogLevels.includes(LOG_LEVEL)) {
  throw new Error(`Invalid LOG_LEVEL: ${LOG_LEVEL}`);
}

const ROAD_RUNNER_BASE_URL = process.env.ROAD_RUNNER_BASE_URL ?? 'http://127.0.0.1:3000';
try {
  const carrierUrl = new URL(ROAD_RUNNER_BASE_URL);
  if (!['http:', 'https:'].includes(carrierUrl.protocol)) {
    throw new Error();
  }
} catch {
  throw new Error('ROAD_RUNNER_BASE_URL must be a valid HTTP(S) URL');
}

const ROAD_RUNNER_API_KEY = process.env.ROAD_RUNNER_API_KEY ?? '';
const timeoutValue = process.env.ROAD_RUNNER_TIMEOUT_MS ?? '1500';
const ROAD_RUNNER_TIMEOUT_MS = Number(timeoutValue);
if (!Number.isSafeInteger(ROAD_RUNNER_TIMEOUT_MS) || ROAD_RUNNER_TIMEOUT_MS < 1) {
  throw new Error(`Invalid ROAD_RUNNER_TIMEOUT_MS: ${timeoutValue}`);
}

const mockEnabledValue = (process.env.ROAD_RUNNER_MOCK_ENABLED ?? 'false').toLowerCase();
if (!['true', 'false'].includes(mockEnabledValue)) {
  throw new Error(`Invalid ROAD_RUNNER_MOCK_ENABLED: ${mockEnabledValue}`);
}
const ROAD_RUNNER_MOCK_ENABLED = mockEnabledValue === 'true';
const ROAD_RUNNER_MOCK_MODE = process.env.ROAD_RUNNER_MOCK_MODE ?? 'normal';
const delayValue = process.env.ROAD_RUNNER_MOCK_DELAY_MS ?? '2500';
const ROAD_RUNNER_MOCK_DELAY_MS = Number(delayValue);
if (!Number.isSafeInteger(ROAD_RUNNER_MOCK_DELAY_MS) || ROAD_RUNNER_MOCK_DELAY_MS < 0) {
  throw new Error(`Invalid ROAD_RUNNER_MOCK_DELAY_MS: ${delayValue}`);
}

export {
  PORT,
  LOG_LEVEL,
  ROAD_RUNNER_BASE_URL,
  ROAD_RUNNER_API_KEY,
  ROAD_RUNNER_TIMEOUT_MS,
  ROAD_RUNNER_MOCK_ENABLED,
  ROAD_RUNNER_MOCK_MODE,
  ROAD_RUNNER_MOCK_DELAY_MS
};