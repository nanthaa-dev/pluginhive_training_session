# Day 12 — Road Runner evidence

The outputs below were produced by calling `GET /rates` against the API with
`pickup=560001`, `drop=682001`, and `grams=1500`. The mock is enabled only for
these local demonstrations.

## Normal carrier response

With `ROAD_RUNNER_MOCK_MODE=normal`:

```json
{
  "status": 200,
  "body": {
    "success": true,
    "data": [
      {
        "carrier": "Road Runner",
        "tier": "SAVER",
        "pricePaise": 8950,
        "minDays": 6,
        "maxDays": 8
      },
      {
        "carrier": "Road Runner",
        "tier": "RUSH",
        "pricePaise": 21000,
        "minDays": 1,
        "maxDays": 2
      }
    ]
  }
}
```

## Slow carrier / timeout

With `ROAD_RUNNER_MOCK_MODE=slow`,
`ROAD_RUNNER_MOCK_DELAY_MS=60`, and `ROAD_RUNNER_TIMEOUT_MS=15`:

```json
{
  "status": 504,
  "body": {
    "success": false,
    "error": {
      "carrier": "Road Runner",
      "reason": "timeout",
      "message": "Road Runner request timed out"
    }
  }
}
```

## Malformed carrier response

With `ROAD_RUNNER_MOCK_MODE=malformed`, the mock returns HTTP 200 with a
missing `days` field. The adapter rejects it instead of returning a partial
rate:

```json
{
  "status": 502,
  "body": {
    "success": false,
    "error": {
      "carrier": "Road Runner",
      "reason": "invalid_response",
      "message": "Road Runner returned invalid delivery days"
    }
  }
}
```

## Verification

```text
node --test shiphub-api/tests/road-runner-adapter.test.js
tests 7
pass 7
fail 0
```
