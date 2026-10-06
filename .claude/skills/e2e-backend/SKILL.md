---
name: e2e-backend
description: Run the backend-only e2e test of a feature - start postgres and redis containers, start the account and auth services, run the targeted `<feature>.e2e-spec.ts`, then stop the services.
---

# E2E Backend Skill

Usage: `/e2e-backend <feature>`

Verifies a feature end to end over HTTP against the real `account` and `auth` services. Backend only: no frontend, no prometheus/grafana. It runs tests, it never writes them or changes production code.

## Preconditions

1. A target test exists: `<service>/test/<feature>.e2e-spec.ts` (`auth` or `account`). Find it with `ls */test/<feature>.e2e-spec.ts`.
2. That service has `test/jest-e2e.json` (`account` does, `auth` does not yet).
3. Docker is running.

If a check fails, **stop** and say which one. Do not write the test or the config. The test is derived from `specs/<feature>/<feature>.feature` and `spec.md`; the human decides when it gets written.

## Steps

Run from the repo root.

1. Infra only (postgres `5132`, redis `6379`):

   ```bash
   docker compose up -d --wait postgres redis
   ```

2. Start both services in the background (`run_in_background`), each from its own directory. They read their own `.env`; `account` runs migrations on start.

   ```bash
   cd account && npm run start:dev
   cd auth && npm run start:dev
   ```

3. Wait until both answer (Swagger is served by each):

   ```bash
   until curl -sf http://localhost:9000/api/account/docs >/dev/null; do sleep 2; done
   until curl -sf http://localhost:9001/api/auth/docs >/dev/null; do sleep 2; done
   ```

   Give up after about 60 s and show the service output.

4. Run only the target test, from the service directory:

   ```bash
   cd <service> && npx jest --config ./test/jest-e2e.json <feature>
   ```

5. Stop the two service processes you started. Leave the containers running; stop them only if asked (`docker compose stop postgres redis`).

## Rules

- Never use `docker compose down -v`: it deletes the database volume.
- Run only the target test, not the whole e2e suite.
- Tests create their own users (unique logins) through the `account` API; do not rely on pre-existing data and do not delete shared data.
- Report the jest result as is. If it fails, show the failing assertion; do not edit the test or the code to make it pass.
- If a port is already taken by a running service, reuse it instead of starting another.
