#!/bin/bash

LOGIN="${1:-johndoe}"
PASSWORD="${2:-securePassword123}"
PHONE="${3:-79001110101}"
FIRST_NAME="${4:-John}"
LAST_NAME="${5:-Doe}"
EMAIL="${6:-john.doe@example.com}"

curl -X POST http://localhost:9000/api/account/user \
  -H "Content-Type: application/json" \
  -d "{
    \"login\": \"$LOGIN\",
    \"password\": \"$PASSWORD\",
    \"phone\": \"$PHONE\",
    \"firstName\": \"$FIRST_NAME\",
    \"lastName\": \"$LAST_NAME\",
    \"email\": \"$EMAIL\"
  }"

