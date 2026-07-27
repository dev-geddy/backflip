# Droplet setup

One-time provisioning of a fresh droplet. Safe to re-run — idempotent.

## What it does
- Installs base packages, adds 2G swap (if none present)
- Installs Docker + the Compose plugin (db only)
- Installs Node 20 (NodeSource) + corepack, pm2 (with systemd startup)
- Installs native Caddy (official apt repo)
- Configures `ufw`: allows SSH, 80, 443 (TCP+UDP) (denies everything else)
- Creates `/opt/backflip` and `/opt/backflip/.releases` (deploy target)

## Run it
```bash
./devops/setup-droplet.sh -h <host> -i <ssh-key>
```

## First-time env files
Copy the templates, fill in real values:
```bash
cp devops/env/production.env.example .env.production
cp devops/env/production.env.local.example .env.production.local
```
- `.env.production` → droplet `.env`: `POSTGRES_*`, `DATABASE_URL` (`127.0.0.1:5432`), `ENCRYPTION_KEY`, `DOMAIN`
- `.env.production.local` → droplet `.env.local`: `AUTH_SECRET`, `AUTH_TRUST_HOST`, `AUTH_URL`, optional `AUTH_GOOGLE_*`

Pass both to the first `deploy.sh` run via `--env` / `--env-local` (see [deploy-local.md](./deploy-local.md)). Omit on later deploys — they never overwrite droplet env.

## One-off owner seed
Run once, after the first deploy, to create the admin user:
```bash
scp -i <ssh-key> .env.init root@<host>:/opt/backflip/.env.init
ssh -i <ssh-key> root@<host> 'cd /opt/backflip && corepack yarn init-owner && rm .env.init'
```
Seed script reads `/opt/backflip/.env` + `.env.init` directly on the host.

## Troubleshooting
- `Permission denied (publickey)` → `chmod 600 <ssh-key>`.
- Ran `ufw` changes and lost SSH access? Reboot the droplet from the DigitalOcean console — `ufw` always allows SSH by default here, but a manual firewall edit outside this script can still lock you out.
- Safe to re-run `setup-droplet.sh` any time — it only installs/configures what's missing.
- Build OOM on small droplets → mitigated by the 2G swap `setup-droplet.sh` creates.
