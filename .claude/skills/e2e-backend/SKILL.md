---
name: e2e-backend
description: Run backend-only e2e tests - start postgres and redis containers, start the account and auth services, run the `<feature>.e2e-spec.ts` of a given feature (or all e2e tests if no feature is given), then stop the services.
---

# E2E Backend Skill

Usage: `/e2e-backend [feature]`

With a feature, runs only its test. Without one, runs every e2e test of both services.

Verifies a feature end to end over HTTP against the real `account` and `auth` services. Backend only: no frontend, no prometheus/grafana. It runs tests, it never writes them or changes production code.

## Preconditions

1. With a feature: the target test exists, `<service>/test/<feature>.e2e-spec.ts` (`auth` or `account`). Find it with `ls */test/<feature>.e2e-spec.ts`. Without a feature: at least one `*/test/*.e2e-spec.ts` exists.
2. Each service whose tests will run has `test/jest-e2e.json`.
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

4. Run the tests from the service directory.

   With a feature, only its test:

   ```bash
   cd <service> && npx jest --config ./test/jest-e2e.json <feature>
   ```

   Without a feature, every service that has e2e tests:

   ```bash
   cd <service> && npx jest --config ./test/jest-e2e.json
   ```

5. Stop the two service processes you started. Leave the containers running; stop them only if asked (`docker compose stop postgres redis`).

## Rules

- Never use `docker compose down -v`: it deletes the database volume.
- With a feature, run only its test, not the whole e2e suite.
- Tests create their own users (unique logins) through the `account` API; do not rely on pre-existing data and do not delete shared data.
- Report the jest result as is. If it fails, show the failing assertion; do not edit the test or the code to make it pass.
- If a port is already taken by a running service, reuse it instead of starting another.
