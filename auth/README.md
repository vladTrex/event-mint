```
curl -X 'POST' \
  'http://localhost:9001/api/auth/login' \
  -H 'accept: */*' \
  -H 'Content-Type: application/json' \
  -d '{
  "login": "johndoe",
  "password": "securePassword123"
}'
```