import { CarrierError } from './carrier-error.js';

export async function requestCarrierJson({
  url,
  token,
  body,
  timeoutMs,
  fetchImpl = fetch
}) {
  if (!token) {
    throw new CarrierError('configuration', 'Road Runner API key is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response;
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Token': token
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (error) {
      if (controller.signal.aborted || error?.name === 'AbortError') {
        throw new CarrierError('timeout', 'Road Runner request timed out', { cause: error });
      }
      throw new CarrierError('connection', 'Could not connect to Road Runner', { cause: error });
    }

    if (response.status === 401) {
      throw new CarrierError('unauthorized', 'Road Runner rejected the API key');
    }
    if (response.status === 429) {
      throw new CarrierError('rate_limited', 'Road Runner rate limit was exceeded');
    }
    if (response.status >= 500) {
      throw new CarrierError('server_error', `Road Runner returned HTTP ${response.status}`);
    }
    if (!response.ok) {
      throw new CarrierError('http_error', `Road Runner returned HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.toLowerCase().includes('text/html')) {
      throw new CarrierError('invalid_response', 'Road Runner returned HTML instead of JSON');
    }

    try {
      return await response.json();
    } catch (error) {
      if (controller.signal.aborted || error?.name === 'AbortError') {
        throw new CarrierError('timeout', 'Road Runner request timed out', { cause: error });
      }
      throw new CarrierError('invalid_response', 'Road Runner returned invalid JSON', { cause: error });
    }
  } finally {
    clearTimeout(timeout);
  }
}
