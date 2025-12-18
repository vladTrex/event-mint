#!/bin/bash

USER_ID="${1}"

if [ -z "$USER_ID" ]; then
  echo "Usage: ./scripts/delete-user.sh <user_id>"
  exit 1
fi

curl -X DELETE "http://localhost:9000/api/account/user/$USER_ID" \
  -H "Content-Type: application/json"

