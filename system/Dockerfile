# ── Stage 1: pull Composer binary from its own minimal image ─────────────────
FROM composer:2 AS composer-bin

# ── Stage 2: application image ───────────────────────────────────────────────
FROM php:8.2-apache

# Install build-time deps, compile PHP extensions (PostgreSQL + gd + zip), then
# wipe the apt cache – all in one layer to keep the image small.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        zip \
        unzip \
        git \
        libpng-dev \
        libjpeg-dev \
        libzip-dev \
        libfreetype6-dev \
        libpq-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" gd zip pdo pdo_pgsql pgsql \
    && rm -rf /var/lib/apt/lists/*

# Bring in Composer without curl-piping an installer script
COPY --from=composer-bin /usr/bin/composer /usr/local/bin/composer

# Apache configuration (docroot -> /public, mod_rewrite for Laravel)
RUN a2enmod rewrite
COPY apache2/sites-available/laravel.conf /etc/apache2/sites-available/laravel.conf
COPY php/local.ini /usr/local/etc/php/conf.d/local.ini
RUN a2ensite laravel.conf && a2dissite 000-default.conf

WORKDIR /var/www/html

# Copy application source (the bind mount shadows this at runtime in dev;
# the COPY makes the image usable standalone for a production build too).
COPY . .

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Entrypoint validates vendor/, key, runs migrations/seed, then starts Apache.
# Apache's master process stays root (so it can bind :80) and forks workers as www-data.
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["apache2-foreground"]
