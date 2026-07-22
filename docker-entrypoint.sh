#!/bin/sh
set -e

# Apply any pending DB migrations against the mounted volume, then start the server.
echo "Running database migrations…"
node --experimental-strip-types src/lib/server/db/migrate.ts

echo "Starting Manolympics on port ${PORT:-3000}…"
exec node build
