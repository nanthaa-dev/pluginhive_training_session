# Day 09 — Terminal evidence

Validation was performed on 2026-11-16. Database passwords are omitted from
this evidence.

## Reproduced baseline failures

Before repair:

```text
$ docker compose config --services
mongo

$ test -e .env
root .env is missing
```

The original setup script only initialized `shiphub-api` and `shiphub-web`, and
the root Compose file had no API, PostgreSQL, migration, or healthcheck service.
Compose also warned that both `compose.yaml` and `docker-compose.yml` were
present and selected `compose.yaml`.

At `2026-11-16T16:06:52+05:30`, the required baseline `docker compose up -d`
failed to start MongoDB:

```text
Error response from daemon: ports are not available: exposing port TCP 0.0.0.0:27017 ... bind: address already in use

$ docker compose ps -a
shiphub-mongo-1   mongo:8.0   ...   Created
```

`docker compose logs --timestamps --no-color mongo` had no application logs:
the container failed before its process started. The timestamped daemon error
is the startup-failure evidence.

The baseline API image also lacked migration files:

```text
$ docker run --rm --entrypoint sh shiphub-api:day08 -c 'test -d /app/migrations'
Baseline API image has no /app/migrations directory
```

The first repaired-stack attempt at `2026-11-16T16:09:40+05:30` also showed:

```text
Image shiphub-api:day09 Error pull access denied for shiphub-api
```

Compose then built the API image and completed, but the migration service had
not declared that build itself. Adding the same build context and Dockerfile to
`migrate` removed the unnecessary registry pull; the three runs below had no
pull error.

## Configuration and environment validation

`npm run setup` created the root `.env`; it skipped the existing API `.env` and
created the web `.env`. Then:

```text
$ docker compose config --quiet
exit code 0

$ docker compose config --services
mongo
migrate
api
postgres

$ git check-ignore -v .env
.gitignore:3:**/.env  .env

$ git status --short --untracked-files=all -- .env
(no output; .env is not tracked)
```

## Three consecutive clean starts

Each run followed a single `docker compose down -v` and used
`docker compose up -d --build --wait --wait-timeout 180`:

| Run | Start (`+05:30`) | Finish (`+05:30`) | Result |
|---|---|---|---|
| 1 | 16:10:32 | 16:10:45 | success |
| 2 | 16:10:45 | 16:10:56 | success |
| 3 | 16:10:56 | 16:11:06 | success |

`docker compose ps -a` after each run showed:

```text
shiphub-api-1       shiphub-api:day09   Up (healthy)
shiphub-migrate-1   shiphub-api:day09   Exited (0)
shiphub-mongo-1     mongo:8.0           Up (healthy)
shiphub-postgres-1  postgres:17         Up (healthy)
```

Timestamped migration logs confirmed successful completion:

```text
2026-11-16T10:40:39Z Priority migration completed
2026-11-16T10:40:50Z Priority migration completed
2026-11-16T10:41:00Z Priority migration completed
```

## API persistence across `npm run down` / `npm run up`

The API returned HTTP `201 Created` for an order with ID
`ORD-1794825696424`. After `npm run down` and `npm run up`, requesting
`/orders/ORD-1794825696424` returned HTTP `200 OK` with the same order data.

Timestamped final service logs included `MongoDB connected successfully`, API
startup, successful `GET /orders` and `GET /orders/ORD-1794825696424`, and
`Priority migration completed`. The named MongoDB volume retained the order
across container removal and recreation.
