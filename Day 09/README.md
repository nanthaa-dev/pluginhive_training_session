# Day 09 — Repair, prove, and document ShipHub

The root [`compose.yaml`](../compose.yaml), root [`.env.example`](../.env.example),
and [NOTES.md](../NOTES.md) contain the repaired stack and diagnosis. The API
Dockerfile packages the existing MongoDB migration; application code was not
changed.

## Create local settings

Run once from the repository root. Setup creates the root `.env` from the
tracked `.env.example` without replacing existing environment files:

```bash
npm run setup
git check-ignore -v .env
git status --short --untracked-files=all
```

`.env.example` uses a local-only PostgreSQL placeholder password. Replace it in
`.env` for private local use; never commit `.env` or use the placeholder in
production.

## Reproduce a clean stack and verify three starts

The initial `down -v` deliberately removes this Compose project's named
database volumes so the first run is a clean initialization. It does not remove
the separately named Day 08 volumes.

```bash
docker compose down -v
docker compose config --quiet
```

Run the following command three times. After each run, capture the timestamp,
status, and migration logs:

```bash
date --iso-8601=seconds
docker compose up -d --build --wait --wait-timeout 180
docker compose ps -a
docker compose logs --timestamps --no-color migrate
```

Expected state: `api`, `mongo`, and `postgres` are `healthy`; `migrate` is
`Exited (0)`. `docker compose logs --timestamps --no-color` captures service
startup logs when investigating any failure.

## Prove an order survives `npm run down` / `npm run up`

Create an order and copy its returned `id`:

```bash
curl -sS -X POST http://localhost:3002/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: day09-persistence-check' \
  -d '{"customer":"Day 09 Check","product":"Persistence Test"}'
```

Then recreate containers without deleting the data volumes and query the
copied ID:

```bash
npm run down
npm run up
docker compose ps -a
curl -i http://localhost:3002/orders/REPLACE_WITH_RETURNED_ID
```

`npm run down` preserves named volumes. Do not use `docker compose down -v`
after creating the order.

## Stack overview

- API: `http://localhost:3002`; connects to MongoDB at the service hostname
  `mongo:27017`.
- MongoDB 8: host port `27019`; named volume `mongo-data`.
- PostgreSQL 17: host port `5434`; named volume `postgres-data`.
- API migration: one-shot `migrate` service; PostgreSQL is included for the
  assignment but is not used by the current API.

See [evidence.md](./evidence.md) for the recorded baseline failure and final
validation results.
