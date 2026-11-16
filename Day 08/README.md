# Day 08 — Dockerise the ShipHub application

This exercise builds the ShipHub API as a production-style image and runs it
with MongoDB 8.0 and PostgreSQL 17. The API uses MongoDB, as in the existing
application; PostgreSQL is included to practise running and persisting a second
database container.

## Files

- [`../shiphub-api/Dockerfile`](../shiphub-api/Dockerfile) — multi-stage Node.js
  22 image, production dependencies, non-root runtime user, and startup command.
- [`../shiphub-api/.dockerignore`](../shiphub-api/.dockerignore) — excludes
  local dependencies, environment files, tests, and other build-context files.
- [`compose.yaml`](./compose.yaml) — API, MongoDB, PostgreSQL, network,
  healthchecks, host ports, and named persistent volumes.
- [`.env.example`](./.env.example) — local configuration template. Do not put
  real credentials in this tracked file.
- [`evidence.md`](./evidence.md) — build, runtime, connectivity, persistence,
  and troubleshooting results from local validation.

## Build and start

Run commands from the repository root:

```bash
cp -n "Day 08/.env.example" "Day 08/.env"
```

For local practice, the example password works; replace it with a private value
if desired. The `.env` file is git-ignored and is passed to Compose, not copied
into the image.

```bash
docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" config
docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" up -d --build
docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" ps
```

The API is available at <http://localhost:3001/orders>. MongoDB and PostgreSQL
are published on ports `27018` and `5433`; from the API container use the Compose
service hostname `mongo`, not `localhost` or `127.0.0.1`.

The API's MongoDB URI is `mongodb://mongo:27017/shiphub`. Compose injects this
setting into the API container, while the `.dockerignore` prevents local `.env`
files from entering the build context. PostgreSQL credentials are supplied to
the PostgreSQL container through Compose environment variables. These local
development services have no production hardening; use real secrets and
appropriate access controls before deploying.

## Image versus container

An **image** is the built, reusable template; a **container** is a running
instance created from an image, with its own process and writable layer. The
API image is named `shiphub-api:day08`; list it separately from running
containers:

```bash
docker image ls shiphub-api
docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" ps
docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" logs api
```

## Verify application and database connectivity

```bash
curl -i http://localhost:3001/orders
curl -i -X POST http://localhost:3001/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: day08-docker-check' \
  -d '{"customer":"Day 08 Docker Test","product":"Container Setup"}'
```

The `api` service connects to MongoDB over the Compose network using the
hostname `mongo`. PostgreSQL is independent of the current API; verify it is
accepting connections with:

```bash
docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" exec postgres \
  sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

## Verify database persistence

Create a MongoDB marker and a PostgreSQL marker. These commands are safe to
repeat:

```bash
docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" exec -T mongo \
  mongosh --quiet --eval 'db.getSiblingDB("shiphub").day08_checks.updateOne({_id:"persistence-check"},{$set:{value:"saved"}},{upsert:true})'

docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" exec -T postgres \
  psql -U shiphub -d shiphub -c \
  "CREATE TABLE IF NOT EXISTS docker_persistence_check (check_id text PRIMARY KEY, value text NOT NULL);
   INSERT INTO docker_persistence_check (check_id, value) VALUES ('persistence-check', 'saved')
   ON CONFLICT (check_id) DO UPDATE SET value = EXCLUDED.value;
   SELECT * FROM docker_persistence_check;"
```

Restart and verify both markers remain:

```bash
docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" restart mongo postgres
docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" exec -T mongo \
  mongosh --quiet --eval 'printjson(db.getSiblingDB("shiphub").day08_checks.findOne({_id:"persistence-check"}))'
docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" exec -T postgres \
  psql -U shiphub -d shiphub -c "SELECT * FROM docker_persistence_check;"
```

The named volumes survive container recreation. To verify that, use `down`
without `-v`, then start the services again and repeat the marker queries:

```bash
docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" down
docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" up -d
```

**Do not use `docker compose down -v`** if you want to retain the sample data;
that option deletes the named volumes.

## Troubleshooting notes

- **Dependencies missing at runtime:** the API build context is
  `shiphub-api/`; the Dockerfile copies its lockfile and runs `npm ci
  --omit=dev` inside the build. Do not depend on host `node_modules`.
- **Editor shows TypeScript errors in `.dockerignore`:** these are caused by
  the file being parsed as code, not by Docker. Workspace settings associate it
  with the `ignore` syntax; reopen the file or select Ignore Files in the
  VS Code language-mode menu if diagnostics remain.
- **Wrong working directory or files not found:** the Dockerfile sets
  `WORKDIR /app`, and Compose resolves the build context relative to
  `Day 08/compose.yaml`.
- **Host port already allocated:** change `API_HOST_PORT`, `MONGO_HOST_PORT`,
  or `POSTGRES_HOST_PORT` in `Day 08/.env`; the service ports inside the
  Compose network remain unchanged.
- **MongoDB connection refused from the API:** `127.0.0.1` inside a container
  points back to that same container. Use `mongo` as the hostname and let
  Compose wait for its healthcheck.
- **Database contents disappear after a restart:** confirm the named volumes
  are mounted and avoid `docker compose down -v`.

Stop the stack while keeping its named volumes:

```bash
docker compose --env-file "Day 08/.env" -f "Day 08/compose.yaml" down
```
