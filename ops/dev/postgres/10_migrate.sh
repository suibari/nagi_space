#!/bin/sh
# ローカル開発用：db/migrations を順に適用し、PostgREST のロールに API ロールを与える。
set -e
for f in /migrations/*.sql; do
	psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
done
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "grant nagi_space_api to authenticator;"
