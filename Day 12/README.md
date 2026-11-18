# Day 12 — Third carrier: Road Runner

## Architecture

```text
GET /rates
    Core route / rate service
        ↓ Carrier adapter port (getRates)
            ↓ Road Runner adapter
                ↓ carrier boundary (timeout, HTTP and JSON handling)
                    ↓ POST {ROAD_RUNNER_BASE_URL}/road-runner/v1/estimate
```

Road Runner is an adapter behind the rate-service boundary. Its authentication
header, request naming (`drop`, `grams`), INR prices, and textual delivery
windows are handled in that adapter; the service and API expose only ShipHub
rate values. The existing order and GraphQL core remains separate and unchanged
apart from mounting the new routes.

The existing checkout has no carrier implementation to extend. The Road Runner
adapter therefore implements the local `getRates` port instead of changing any
existing carrier. Differences from a typical internal carrier contract are:

- Road Runner requires `X-Token` rather than a shared bearer header.
- Request weight is expressed in integer grams.
- Prices are rupees as numbers and require exact conversion to whole paise.
- Delivery ranges arrive as text and must be parsed.
- Its 401 and 429 responses are carrier-specific upstream failures.

## Failure mapping

| Upstream condition | `CarrierError.reason` | `/rates` HTTP status | Why |
|---|---|---:|---|
| Request timeout | `timeout` | 504 | Upstream did not answer within the configured budget. |
| DNS, refused connection, or other fetch network failure | `connection` | 502 | ShipHub could not reach the carrier. |
| HTTP 5xx | `server_error` | 502 | Road Runner is unavailable; the gateway remains responsible for ShipHub's response. |
| HTTP 401 / wrong key | `unauthorized` | 502 | ShipHub's upstream credential was rejected; do not imply the caller needs to authenticate. |
| HTTP 429 | `rate_limited` | 502 | The carrier throttled ShipHub; a retry may work later. |
| HTML body or non-JSON body | `invalid_response` | 502 | The adapter contract requires JSON, not an HTML error page. |
| Missing fields, wrong types, malformed `days`, or invalid price | `invalid_response` | 502 | The response cannot safely become a ShipHub `Rate`. |
| Other non-success HTTP status | `http_error` | 502 | Unrecognized upstream status is not a valid quote. |
| Missing API key configuration | `configuration` | 503 | ShipHub cannot make an authenticated carrier request. |

No token or raw upstream response is included in client errors or logs.

## Mock endpoint

When `ROAD_RUNNER_MOCK_ENABLED=true`, the API mounts
`POST /road-runner/v1/estimate`. It requires the configured `X-Token`, accepts
only six-digit pickup/drop postcodes and a positive integer `grams`, and returns
a 400 for invalid input. `ROAD_RUNNER_MOCK_MODE` supports `normal`, `slow`,
`malformed`, `bad-price`, `unauthorized`, `rate-limited`, `server-error`, and
`html`. The slow delay is `ROAD_RUNNER_MOCK_DELAY_MS`.

The deliberately malformed response is HTTP 200 JSON with a missing required
`days` field:

```json
{"ok":true,"options":[{"tier":"SAVER","price_inr":89.5}]}
```

The `bad-price` mode instead returns `price_inr: 89.555` to exercise numeric
precision validation. The mock is for local assignment demonstrations only;
disable it when connecting to the actual carrier.

## Environment and secret handling

Set these variables in the root `.env` for Compose or in `shiphub-api/.env` for
the API's local npm scripts. Matching placeholders are in both `.env.example`
files; `compose.yaml` passes them to the API service.

```env
ROAD_RUNNER_BASE_URL=http://127.0.0.1:3000
ROAD_RUNNER_API_KEY=replace-with-local-mock-key
ROAD_RUNNER_TIMEOUT_MS=1500
ROAD_RUNNER_MOCK_ENABLED=true
ROAD_RUNNER_MOCK_MODE=normal
ROAD_RUNNER_MOCK_DELAY_MS=2500
```

`ROAD_RUNNER_API_KEY` is a secret. Use a real secret manager or untracked local
environment file in deployment; never hard-code it, commit it, return it from
an endpoint, include it in logs/errors, or expose it to the browser. The example
value is only a local mock key, not a production credential.

## Tests

Run the isolated adapter tests (no MongoDB required):

```bash
node --test shiphub-api/tests/road-runner-adapter.test.js
```

They cover normal mapping/request construction, wrong key, malformed price,
timeout, a missing field, HTML, and rate limiting.

## Reflection

I added a dedicated `shiphub-api/rates/` module for the carrier error type,
outbound boundary, Road Runner adapter, rate service, route, and opt-in mock.
I also mounted `/rates` and the mock endpoint in `shiphub-api/server.js`, added
carrier settings to `shiphub-api/config.js`, and included the new module in the
API image. Root and API environment examples plus `compose.yaml` now pass the
carrier URL, token, timeout, and local mock controls. The focused adapter tests
and these Day 12 documents capture the contract and observed results. I left
the order model/store, database migrations, GraphQL schema/resolvers, and web
app untouched because none should know about a carrier's authentication,
pricing units, or wire format. This keeps the assignment isolated from existing
order behavior and avoids spreading Road Runner-specific handling into
persistence or presentation. The adapter is the only layer that translates
the carrier payload into ShipHub's `Rate` shape; a later carrier can implement
that same service boundary without changing existing order flows. That gives
the integration an explicit timeout/error boundary and makes it independently
testable while keeping the core architecture small and stable.
