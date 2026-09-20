#!/usr/bin/env bash
# One-shot migration verification + attack battery against a fresh Postgres.
# Usage: bash scripts/run-arena.sh
set -u
CONTAINER=mirvyn-attack-pg
LOG=/tmp/arena-migrations.log

docker exec $CONTAINER psql -U postgres -c "DROP DATABASE IF EXISTS arena;" -c "CREATE DATABASE arena;" >/dev/null 2>&1

echo "== bootstrap =="
docker exec -i $CONTAINER psql -U postgres -d arena -q < scripts/attack-arena-bootstrap.sql 2>&1 | grep -E "ERROR" | head -5

echo "== migrations (single pass) =="
: > $LOG
for f in $(ls supabase/migrations/*.sql | sort); do
  echo "### $(basename $f)" >> $LOG
  docker exec -i $CONTAINER psql -U postgres -d arena -v ON_ERROR_STOP=0 -q < "$f" >> $LOG 2>&1
done
echo "-- files with errors: --"
awk '/^### /{f=$2} /ERROR/{if (f!=last) {print f; last=f}}' $LOG

echo "== attack battery =="
docker exec -i $CONTAINER psql -U postgres -d arena -v ON_ERROR_STOP=0 < scripts/attack-battery.sql 2>&1 | grep -vE "^(SET|DO|NOTICE|INSERT|UPDATE|CREATE|ALTER|GRANT|REVOKE|psql.*)?$" | head -60

echo "== attack battery v2 (seal verification) =="
docker exec -i $CONTAINER psql -U postgres -d arena -v ON_ERROR_STOP=0 < scripts/attack-battery-v2.sql 2>&1 | grep -E "VULNERABLE|BLOCKED|OK\]|BROKEN|SUCCEEDED" | head -60

echo "== attack battery v3 (round-3 seal verification) =="
docker exec -i $CONTAINER psql -U postgres -d arena -v ON_ERROR_STOP=0 < scripts/attack-battery-v3.sql 2>&1 | grep -E "VULNERABLE|BLOCKED|OK\]|BROKEN|SUCCEEDED" | head -30
