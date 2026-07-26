# Deploying Petals Wander to AWS Lightsail

A single Ubuntu Lightsail instance runs the whole stack with Docker Compose:
**Caddy** (front door, HTTP/HTTPS) → **web** (Next.js) + **system** (Laravel) + **db**
(PostgreSQL). The browser talks to everything on one origin, so there is no CORS
to configure and no second DNS record.

We deploy in two passes:

1. **HTTP on the raw static IP** — prove the stack works.
2. **Flip to HTTPS on your domain** — once DNS points at the instance.

---

## 0. Prerequisites

- A Lightsail **Ubuntu 22.04/24.04** instance (2 GB RAM / $12 plan).
- A **static IP** attached to it (Lightsail → Networking → Create static IP).
- Firewall (Lightsail → instance → Networking) allows **80 (HTTP)** and
  **443 (HTTPS)** in addition to 22 (SSH).
- The code pushed to your **private GitHub repo** (done from the dev machine).

SSH in (from the Lightsail browser terminal, or your own terminal):

```bash
ssh -i LightsailDefaultKey.pem ubuntu@YOUR.STATIC.IP
```

---

## 1. Install Docker on the server

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker            # or log out and back in
docker compose version   # confirm the compose plugin is present
```

---

## 2. Get the code onto the server (private repo → deploy key)

Generate a read-only deploy key on the server:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/petals_deploy -N ""
cat ~/.ssh/petals_deploy.pub
```

Add that public key to the repo on GitHub:
**repo → Settings → Deploy keys → Add deploy key** (read-only is enough).

Tell git to use it, then clone:

```bash
echo -e "Host github.com\n  IdentityFile ~/.ssh/petals_deploy\n  IdentitiesOnly yes" >> ~/.ssh/config
git clone git@github.com:YOUR_USER/YOUR_REPO.git petals
cd petals
```

---

## 3. Configure the environment

```bash
cp .env.production.example .env
nano .env
```

Set at minimum, for the **first (HTTP) deploy**:

```ini
APP_URL=http://YOUR.STATIC.IP
APP_DOMAIN=YOUR.STATIC.IP
SITE_ADDRESS=:80
POSTGRES_PASSWORD=<a strong password: openssl rand -base64 24>
```

Build the images, then generate the app key and paste it back into `.env`:

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml run --rm --no-deps --entrypoint php system \
  artisan key:generate --show
# copy the base64:... line into .env as APP_KEY=base64:...
```

---

## 4. Launch

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f system   # watch first-boot migrate + seed
```

The empty database is seeded once (admin user, demo catalog, payment settings).

---

## 5. Verify

```bash
curl -sS localhost/api/health          # -> {"status":"ok",...}
curl -sS -o /dev/null -w "%{http_code}\n" localhost/   # -> 200
```

Then open `http://YOUR.STATIC.IP` in a browser. Storefront should load; admin at
`http://YOUR.STATIC.IP/admin` (log in with the seeded admin — **change its
password immediately**, see §8).

---

## 6. Switch to HTTPS (once DNS is ready)

Point your domain's **A record** at the static IP and wait for it to resolve
(`dig +short petalswander.com` shows the IP). Then edit `.env`:

```ini
APP_URL=https://petalswander.com
APP_DOMAIN=petalswander.com
SITE_ADDRESS=petalswander.com
```

Re-launch — Caddy fetches a Let's Encrypt certificate automatically:

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml restart system   # re-cache config with the new APP_URL
```

Visit `https://petalswander.com`. HTTP auto-redirects to HTTPS.

> Note: images/receipts uploaded during the HTTP phase were saved with `http://IP`
> URLs. If you tested uploads, re-upload them (or reseed) after the switch.

---

## 7. Updating the app later

```bash
cd ~/petals
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Migrations run automatically on boot; existing data is preserved (never reseeded).

---

## 8. Operations

**Change the seeded admin password** (do this first):
```bash
docker compose -f docker-compose.prod.yml exec system php artisan tinker --execute="\
\$u=App\Models\User::where('email','admin@petalwanders.test')->first();\
\$u->password=bcrypt('YOUR_NEW_PASSWORD');\$u->save();echo 'done';"
```

**Logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f            # all services
docker compose -f docker-compose.prod.yml logs -f caddy      # TLS / routing issues
```

**Back up the database:**
```bash
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U flowershop flowershop > backup-$(date +%F).sql
```

**Restart / stop:**
```bash
docker compose -f docker-compose.prod.yml restart
docker compose -f docker-compose.prod.yml down     # stop (volumes/data kept)
```

---

## What this differs from the dev setup

- `web` runs `next build` + `next start` (not `next dev`); `system` bakes composer
  deps and does **not** bind-mount source.
- The entrypoint runs `migrate --force`, seeds **only an empty** database, and
  caches config/routes — it never resets data.
- No Mailpit, no Adminer, and the database port is **not** published. Email is
  log-only until you set real SMTP in `.env`.
- Uploaded files persist in the `system-storage` volume across rebuilds.
