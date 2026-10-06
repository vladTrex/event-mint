---
name: env-up
description: Bring up the local backend environment (postgres, redis, account, auth) and check it responds. Steps are in docs/local-env.md.
---

# Env Up Skill

Usage: `/env-up`

Starts the local backend environment. Not a workflow stage; it changes no code.

## Steps

Follow `docs/local-env.md`.

0. Check first: containers healthy and both Swagger URLs return 200. If everything is already up, **reply immediately** with the Swagger URLs and stop; do not run the steps below.

1. `docker compose up -d --wait postgres redis`.
2. If port 9000 / 9001 is already listening, reuse that service. Otherwise start `account` and `auth` with `npm run start:dev` in the background, each from its own directory.
3. Wait until `http://localhost:9000/api/account/docs` and `http://localhost:9001/api/auth/docs` return 200; give up after about 60 s and show the service log.
4. Report what is up, what was already running, and the Swagger URLs.

## Rules

- Start redis-commander, prometheus and grafana only if asked.
- Never use `docker compose down -v`.
- Do not stop services that were already running.
