# Day 08 Docker evidence

**Validation date:** 2026-11-16

## Image and running containers

Built `shiphub-api:day08` from `shiphub-api/Dockerfile`. The image inspection
reported:

```text
Image=sha256:82374904ad2c6905522c5c44eabb63afcfd2302d8fb2e78b101f054eb4cc59a4
User=node
ExposedPorts={"3000/tcp":{}}
```

`docker compose ... ps` showed all three services healthy:

| Service | Image | Host address |
|---|---|---|
| `api` | `shiphub-api:day08` | `127.0.0.1:3001 -> 3000` |
| `mongo` | `mongo:8.0` | `127.0.0.1:27018 -> 27017` |
| `postgres` | `postgres:17` | `127.0.0.1:5433 -> 5432` |

The running database versions reported MongoDB `8.0.38` and PostgreSQL
`17.12`.

This distinguishes the API **image** (the built template) from its running
**container** (`shiphub-day08-api-1`). MongoDB and PostgreSQL are separate
containers attached to the Compose bridge network.

## Application connectivity

`GET http://127.0.0.1:3001/orders` returned HTTP 200 and a successful JSON
response. A `POST /orders` also succeeded and created:

```text
ORD-1794819381786
customer: Day 08 Docker Test
product: Container Setup
```

A subsequent GET returned the same order from MongoDB. The API connects using
`mongodb://mongo:27017/shiphub`, confirming service-name networking rather
than loopback inside the API container.

## Database persistence

Inserted a MongoDB marker (`day08_checks` / `_id: persistence-check`) and a
PostgreSQL marker (`docker_persistence_check` / `persistence-check`). Both
markers were still present after restarting the database containers and after
running `docker compose down` followed by `docker compose up -d` without `-v`.
The order created through the API also remained available after recreation.

## Troubleshooting notes

- The host PostgreSQL service already used port `5432`; mapping the container
  to host port `5433` avoided a conflict. API and MongoDB use `3001` and
  `27018` to keep their host ports distinct from the usual local defaults.
- The API’s local npm scripts load `.env`, but a secret file must not be baked
  into an image. The Docker image instead starts `node server.js`, and Compose
  injects `MONGODB_URI` and other settings from the external environment file.
- `localhost` inside a container is that container, not the database. Using the
  Compose hostname `mongo`, plus a MongoDB healthcheck and `depends_on`, gives
  the API a reachable, ready database.
- The image build ran `npm ci --omit=dev` using the API lockfile and completed
  without missing dependencies. `WORKDIR /app` and the Compose-relative build
  context ensure application files are copied from the intended directory.
