# AGENTS.md

## Project

EventMint — microservices backend for user account management and authentication (early-stage event ticketing platform). Two Node.js/NestJS services:

- `account/` — port 9000, prefix `/api/account`. User CRUD, password verification (argon2), TypeORM + PostgreSQL, ioredis, Prometheus metrics.
- `auth/` — port 9001, prefix `/api/auth`. JWT login and token refresh, calls `account` over HTTP, ioredis.

Shared infra (PostgreSQL, Redis, Prometheus, Grafana, Redis Commander) is defined in `docker-compose.yml`.

## Structure

```
EventMint/
├── account/          # user management microservice (NestJS)
│   ├── src/
│   └── test/         # e2e tests
├── auth/              # authentication microservice (NestJS)
│   └── src/
├── prometheus/        # Prometheus scrape config
├── scripts/           # helper shell scripts (create-user.sh, delete-user.sh, test-auth-login.sh)
└── docker-compose.yml
```

Each service has its own `package.json`, `.env`, `.env.docker`, `Dockerfile`, `tsconfig.json`. No shared/root package.json — commands run per service.

## Commands

Run from inside `account/` or `auth/`:

```bash
npm install
npm run start:dev     # watch mode
npm run build          # nest build
npm run lint            # eslint --fix
npm run test             # jest (unit)
npm run test:cov          # jest with coverage
```

`account/` only:

```bash
npm run test:e2e            # jest --config ./test/jest-e2e.json
npm run migration:generate   # typeorm, requires --name=
npm run migration:run
npm run migration:revert
```

Infra:

```bash
docker compose up -d
docker compose down
```

## Workflow

Features follow `docs/ai-development/WORKFLOW.md`. Feature files live in `specs/<feature>/`.

## Notes

- `account` has no unit (`*.spec.ts`) tests, only one e2e test (`account/test/app.e2e-spec.ts`).
- `auth` has one unit test file (`auth/src/auth.service.spec.ts`).
- Env vars documented in `account/README.md` and `auth/README.md`.
