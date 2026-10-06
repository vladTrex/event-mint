# Auth service

NestJS microservice for authentication. Issues JWT access and refresh tokens by verifying credentials against the **account** service.

- **Port:** `9001`
- **API prefix:** `/api/auth`
- **Swagger:** http://localhost:9001/api/auth/docs

## Prerequisites

- Node.js 20+
- npm
- Running infrastructure (PostgreSQL, Redis) — see root [README](../README.md)
- Running **account** service on port `9000`

## Environment

Copy or create `.env` in this directory:

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_PORT` | `9001` | Service port |
| `HTTP_PREFIX` | `/api/auth` | Global API prefix |
| `ACCOUNT_SERVICE_URL` | `http://localhost:9000/api/account` | Account service base URL |
| `JWT_ALG` | `HS256` | JWT signing algorithm |
| `JWT_ACCESS_SECRET` | — | Access token secret |
| `JWT_ACCESS_EXP` | `1h` | Access token expiration |
| `JWT_REFRESH_SECRET` | — | Refresh token secret |
| `JWT_REFRESH_EXP` | `24h` | Refresh token expiration |
| `REDIS_HOST` | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | `redis` | Redis password |

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

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login and receive JWT tokens |
| `POST` | `/api/auth/refresh/token` | Refresh access token |
| `POST` | `/api/auth/logout` | End the session of the given refresh token (`204`) |

### Login

```bash
curl -X POST http://localhost:9001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "johndoe",
    "password": "securePassword123"
  }'
```

Response:

```json
{
  "access": "<access-token>",
  "refresh": "<refresh-token>"
}
```

### Refresh token

```bash
curl -X POST http://localhost:9001/api/auth/refresh/token \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "<refresh-token>"
  }'
```

## Tests

```bash
npm run test          # unit tests
npm run test:cov      # coverage
```

## Related services

The **account** service (`../account`) must be running for login to work. See [account/README.md](../account/README.md).
