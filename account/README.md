# Account service

NestJS microservice for user management. Handles user CRUD, password verification, and exposes Prometheus metrics. Used internally by the **auth** service.

- **Port:** `9000`
- **API prefix:** `/api/account`
- **Swagger:** http://localhost:9000/api/account/docs

## Prerequisites

- Node.js 20+
- npm
- Docker & Docker Compose

## Environment

Copy or create `.env` in this directory. Default values match the root `docker-compose.yml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_PORT` | `9000` | Service port |
| `HTTP_PREFIX` | `/api/account` | Global API prefix |
| `DB_HOST` | `127.0.0.1` | PostgreSQL host |
| `DB_PORT` | `5132` | PostgreSQL port (mapped in Docker) |
| `DB_DATABASE` | `account-db` | Database name |
| `DB_USERNAME` | `postgres` | Database user |
| `DB_PASSWORD` | `password` | Database password |
| `DB_MIGRATIONS_RUN` | `true` | Run migrations on startup |
| `REDIS_HOST` | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | `redis` | Redis password |

## Infrastructure

PostgreSQL, Redis, Prometheus, and Grafana are defined in the repo root:

```bash
cd ..
docker compose up -d
```

| Service | URL / Port |
|---------|------------|
| PostgreSQL | `localhost:5132` |
| Redis | `localhost:6379` |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3100 (admin / admin) |
| Redis Commander | http://localhost:8081 (admin / admin) |

Stop infrastructure:

```bash
cd ..
docker compose down
```

## Installation

```bash
npm install
```

## Running

```bash
# development (watch mode)
npm run start:dev

# production build
npm run build
npm run start:prod
```

The service starts on http://localhost:9000. Migrations run automatically when `DB_MIGRATIONS_RUN=true`.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/account/user` | Create user |
| `GET` | `/api/account/user` | List users (with filters) |
| `GET` | `/api/account/user/verification` | Verify login & password |
| `GET` | `/api/account/user/:id` | Get user by ID |
| `PATCH` | `/api/account/user/:id` | Update user |
| `PATCH` | `/api/account/user/:id/password` | Set a new password (internal, used by auth) |
| `DELETE` | `/api/account/user/:id` | Delete user |
| `GET` | `/api/account/metrics` | Prometheus metrics |

### Create user

```bash
curl -X POST http://localhost:9000/api/account/user \
  -H "Content-Type: application/json" \
  -d '{
    "login": "johndoe",
    "password": "securePassword123",
    "phone": "79001110101",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  }'
```

### Verify credentials (used by auth service)

```bash
curl "http://localhost:9000/api/account/user/verification?login=johndoe&password=securePassword123"
```

## Database

Connect via Docker:

```bash
docker exec -it account-db psql -U postgres -d account-db
```

Connect from host:

```bash
psql -h localhost -p 5132 -U postgres -d account-db
```

### Migrations

Migrations run automatically on startup. Manual commands:

```bash
# create empty migration
npm run migration:create --name=MigrationName

# generate from entity changes
npm run migration:generate --name=MigrationName

# run / revert
npm run migration:run
npm run migration:revert
```

## Tests

```bash
npm run test          # unit tests
npm run test:e2e      # e2e tests
npm run test:cov      # coverage
```

## Related services

The **auth** service (`../auth`) handles JWT login and calls this service for user verification. Start it separately:

```bash
cd ../auth
npm install
npm run start:dev
```

Auth runs on http://localhost:9001/api/auth.
