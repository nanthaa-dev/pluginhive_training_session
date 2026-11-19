# Day 09 — Repair, prove, and document the ShipHub stack

## Diagnosed faults

### 1. MongoDB host-port collision

- **Symptom:** MongoDB could not start.
- **Evidence:** At `2026-11-16T16:06:52+05:30`, `docker compose up -d` failed with `ports are not available ... 0.0.0.0:27017 ... address already in use`; `docker compose ps -a` showed `shiphub-mongo-1` as `Created`.
- **Cause:** The configured host port `27017` was already occupied.
- **Fix:** Set `MONGO_PORT=27019`; the API uses the service DNS name and container port, not this host port.
- **Proof:** The repaired stack's MongoDB healthcheck passes with host port `27019`.

### 2. Incomplete Compose topology

- **Symptom:** The requested API, PostgreSQL, and migration services were absent.
- **Evidence:** Before repair, `docker compose config --services` listed only `mongo`.
- **Cause:** The root Compose file defined only MongoDB.
- **Fix:** Define `api`, `mongo`, `postgres`, and one-shot `migrate` services on one bridge network.
- **Proof:** `docker compose config --services` lists all four services and the final `up --wait` runs show the three long-running services healthy and migration exited successfully.

### 3. No readiness checks or migration ordering

- **Symptom:** A dependent process could start before MongoDB accepted connections; there was no migration gate.
- **Evidence:** The original MongoDB service had no healthcheck, and no migration service appeared in `docker compose config --services`.
- **Cause:** Startup ordering was not tied to database readiness or migration completion.
- **Fix:** Add database/API healthchecks; gate migration on `mongo: service_healthy` and API on `migrate: service_completed_successfully`.
- **Proof:** The migration exits with code 0 before the API reports healthy.

### 4. Migration script missing from the API image

- **Symptom:** The existing API image could not run the required migration.
- **Evidence:** `docker run --rm --entrypoint sh shiphub-api:day08 -c 'test -d /app/migrations'` failed; the directory was absent.
- **Cause:** The production Dockerfile copied runtime modules but not `migrations/`.
- **Fix:** Copy the migration scripts into the API image and run the existing migration as a separate one-shot service.
- **Proof:** The Day 09 `migrate` container completes with exit code 0.

### 5. Setup omitted the root environment file and npm lifecycle commands

- **Symptom:** Root `.env` was missing and `npm run up` / `npm run down` were not available.
- **Evidence:** `test -e .env` reported missing; the setup script only targeted the API and web directories; `npm run` listed no `up` or `down`.
- **Cause:** Environment initialization and scripts covered only the original app workflow.
- **Fix:** Add root `.env.example`, include the root in environment initialization, and add Compose-backed `up`/`down` scripts. `.env` remains ignored by Git.
- **Proof:** `npm run setup` creates root `.env`; `git check-ignore -v .env` confirms it is ignored.

### 6. Ambiguous Compose file discovery

- **Symptom:** Docker Compose warned that both `compose.yaml` and `docker-compose.yml` were present.
- **Evidence:** `docker compose config --services` reported both files and selected `compose.yaml`.
- **Cause:** Two supported Compose filenames exist in the repository.
- **Fix:** Set `COMPOSE_FILE=compose.yaml` in the root environment template so Compose consistently uses the required root file.
- **Proof:** After setup, `docker compose config --quiet` succeeds without the multiple-file warning.

### 7. Migration image was not built by its service

- **Symptom:** The first clean `up` tried to pull `shiphub-api:day09` from a registry before the API image was built.
- **Evidence:** At `2026-11-16T16:09:40+05:30`, Compose reported `pull access denied for shiphub-api`, then recovered when it built the API service.
- **Cause:** `migrate` referenced the API image but had no `build` definition.
- **Fix:** Give `migrate` the same Docker build context and Dockerfile as `api`.
- **Proof:** Three subsequent clean-start runs built locally and completed without the registry pull error.

The initial failed MongoDB container never started its process, so it produced
no application logs. The timestamped Docker daemon bind error above is the
failure evidence; `docker compose logs --timestamps mongo` was empty at that
point.

## Short explanations

### Why `service_healthy` instead of short-form `depends_on`?

Short-form `depends_on` orders container startup but does not wait for a database
to accept connections. The healthchecks let Compose wait for MongoDB readiness
before migration and for migration completion before starting the API, avoiding
a race at startup.

### Why is migration a separate service?

The priority migration is a one-time database operation, not part of serving
HTTP requests. A separate service can wait for MongoDB, run the existing script
once, expose its exit status, and gate API startup on successful completion.

### One remaining weakness

MongoDB runs without authentication in this local learning stack. Host ports
and placeholder PostgreSQL credentials are for development only; production
would need authenticated database access, managed secrets, and restricted
network exposure.

## Day 13 — Return-to-sender guard

Premature return was initially accepted → the shipment graph allowed
`out_for_delivery → returned` but `move()` did not check failed-attempt count →
`move()` now requires three recorded failures for the return edge → the
`rejects a return before the third failed attempt` test fails without the guard
and passes with it.
