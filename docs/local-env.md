# Local environment

Infra runs in Docker, services run on the host with their own `.env`.

```bash
docker compose up -d --wait postgres redis     # postgres :5132, redis :6379
cd account && npm run start:dev                # :9000, runs migrations on start
cd auth && npm run start:dev                   # :9001
```

Optional: `docker compose up -d redis-commander prometheus grafana`.

| What | URL |
|------|-----|
| account Swagger | http://localhost:9000/api/account/docs |
| auth Swagger | http://localhost:9001/api/auth/docs |
| account metrics | http://localhost:9000/api/account/metrics |
| Redis Commander | http://localhost:8081 (admin / admin) |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3100 (admin / admin) |

Check: both Swagger URLs return 200.

Stop: Ctrl+C the services, `docker compose stop`. Never `docker compose down -v` (deletes the DB volume).
