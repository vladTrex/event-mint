#!/bin/bash

LOGIN="${1:-johndoe}"
PASSWORD="${2:-securePassword123}"

curl -X 'POST' \
  'http://localhost:9001/api/auth/login' \
  -H 'accept: */*' \
  -H 'Content-Type: application/json' \
  -d "{
  \"login\": \"$LOGIN\",
  \"password\": \"$PASSWORD\"
}"

