#!/usr/bin/env bash
set -e

cd /var/www/html

echo "[entrypoint] Waiting for database at ${DB_HOST}:${DB_PORT} ..."
until php -r "exit(@fsockopen(getenv('DB_HOST') ?: 'db', (int)(getenv('DB_PORT') ?: 5432)) ? 0 : 1);" 2>/dev/null; do
    sleep 2
done
echo "[entrypoint] Database is reachable."

# Install dependencies if the vendor dir is missing (fresh checkout / clean clone)
if [ ! -d vendor ] || [ ! -f vendor/autoload.php ]; then
    echo "[entrypoint] vendor/ missing — running composer install ..."
    composer install --no-interaction --prefer-dist --no-progress
fi

# Ensure an application key exists
if ! grep -q '^APP_KEY=base64:' .env 2>/dev/null; then
    echo "[entrypoint] Generating APP_KEY ..."
    php artisan key:generate --force
fi

# Storage/cache must be writable by the Apache (www-data) workers
mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache || true
chmod -R 775 storage bootstrap/cache || true

# Public storage symlink (serves uploaded payment receipts at /storage/...)
php artisan storage:link 2>/dev/null || true

echo "[entrypoint] Running migrations ..."
php artisan migrate --force

echo "[entrypoint] Seeding database (idempotent) ..."
php artisan db:seed --force || echo "[entrypoint] Seeder reported an issue (continuing)."

echo "[entrypoint] Generating API documentation (Scribe) ..."
php artisan scribe:generate || echo "[entrypoint] Scribe generation skipped/failed (continuing)."

php artisan config:clear || true

echo "[entrypoint] Starting: $*"
exec "$@"
