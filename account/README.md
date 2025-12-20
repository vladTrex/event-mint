### Micro Bank system
```
docker exec -it account-db bash
psql -U postgres -d account-db
```

```
psql -h localhost -p 5432 -U postgres
\c account-db
\dt
```
Create User

```
curl -X POST http://localhost:3000/user \
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

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
