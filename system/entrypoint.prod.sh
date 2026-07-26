#!/usr/bin/env bash
# Production entrypoint: waits for the DB, runs migrations (never a fresh reset),
# seeds ONLY an empty database (first deploy), caches config, then starts Apache.
set -e

cd /var/www/html

echo "[entrypoint] Waiting for database at ${DB_HOST}:${DB_PORT} ..."
until php -r "exit(@fsockopen(getenv('DB_HOST') ?: 'db', (int)(getenv('DB_PORT') ?: 5432)) ? 0 : 1);" 2>/dev/null; do
    sleep 2
done
echo "[entrypoint] Database is reachable."

# APP_KEY must be provided via the environment in production. We never generate
# one here because it would rotate on every boot and invalidate sessions.
if [ -z "${APP_KEY}" ]; then
    echo "[entrypoint] FATAL: APP_KEY is not set. Generate one with:"
    echo "             docker compose -f docker-compose.prod.yml run --rm --no-deps --entrypoint php system artisan key:generate --show"
    echo "             then put it in .env (APP_KEY=base64:...) and restart."
    exit 1
fi

# Storage must stay writable (it is a mounted volume so it survives rebuilds).
mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache || true
chmod -R 775 storage bootstrap/cache || true

# Serve uploaded receipts / images at /storage/...
php artisan storage:link 2>/dev/null || true

echo "[entrypoint] Running migrations ..."
php artisan migrate --force

# Seed only when the database is empty (first deploy) so real data is never
# overwritten on subsequent restarts.
USER_COUNT="$(php artisan tinker --execute='echo \App\Models\User::count();' 2>/dev/null | tr -dc '0-9' || echo '')"
if [ "${USER_COUNT}" = "0" ]; then
    echo "[entrypoint] Empty database — seeding initial data ..."
    php artisan db:seed --force || echo "[entrypoint] Seeder reported an issue (continuing)."
else
    echo "[entrypoint] Existing data detected (users=${USER_COUNT:-unknown}) — skipping seed."
fi

# Cache framework config/routes/views for production performance.
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "[entrypoint] Starting: $*"
exec "$@"
