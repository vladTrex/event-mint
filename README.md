# EventMint

Microservices backend for user account management and authentication.

## Architecture

```
┌─────────┐     HTTP      ┌─────────┐     HTTP      ┌──────────┐
│  Client │ ────────────► │  auth   │ ────────────► │ account  │
└─────────┘               └─────────┘               └──────────┘
                               │                          │
                               └──────── Redis ───────────┘
                                              │
                                          PostgreSQL
```

| Service | Port | Prefix | Description |
|---------|------|--------|-------------|
| [account](./account) | `9000` | `/api/account` | User CRUD, password verification, Prometheus metrics |
| [auth](./auth) | `9001` | `/api/auth` | JWT login and token refresh |

Shared infrastructure (PostgreSQL, Redis, Prometheus, Grafana) is defined in [`docker-compose.yml`](./docker-compose.yml).

## Prerequisites

- Node.js 20+
- npm
- Docker & Docker Compose

## Quick start

### 1. Start infrastructure

```bash
docker compose up -d
```

### 2. Start account service

```bash
cd account
npm install
npm run start:dev
```

Swagger: http://localhost:9000/api/account/docs

### 3. Start auth service

In a separate terminal:

```bash
cd auth
npm install
npm run start:dev
```

Swagger: http://localhost:9001/api/auth/docs

### 4. Create a user and log in

```bash
./scripts/create-user.sh
./scripts/test-auth-login.sh
```

Or manually:

```bash
# Create user
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

# Login
curl -X POST http://localhost:9001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "johndoe",
    "password": "securePassword123"
  }'
```

## Infrastructure

| Service | URL / Port | Credentials |
|---------|------------|-------------|
| PostgreSQL | `localhost:5132` | `postgres` / `password`, database `account-db` |
| Redis | `localhost:6379` | password `redis` |
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3100 | `admin` / `admin` |
| Redis Commander | http://localhost:8081 | `admin` / `admin` |

Stop infrastructure:

```bash
docker compose down
```

## Project structure

```
EventMint/
├── account/          # User management microservice
├── auth/             # Authentication microservice
├── prometheus/       # Prometheus scrape config
├── scripts/          # Helper shell scripts
└── docker-compose.yml
```

## Environment

Each service uses its own `.env` file:

- `account/.env` — database, Redis, HTTP settings
- `auth/.env` — JWT secrets, account service URL, Redis

See service READMEs for full variable lists:

- [account/README.md](./account/README.md)
- [auth/README.md](./auth/README.md)

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/create-user.sh` | Create a test user in the account service |
| `scripts/test-auth-login.sh` | Test login via the auth service |
| `scripts/delete-user.sh` | Delete a user by ID |

## Monitoring

The account service exposes Prometheus metrics at:

```
http://localhost:9000/api/account/metrics
```

Prometheus scrapes this endpoint via `host.docker.internal:9000` (see [`prometheus/prometheus.yml`](./prometheus/prometheus.yml)).
