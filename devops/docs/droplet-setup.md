# Droplet setup

One-time provisioning of a fresh droplet. Safe to re-run — idempotent.

## What it does
- Installs Docker + the Compose plugin
- Configures `ufw`: allows SSH, 80, 443 (denies everything else)
- Creates `/opt/backflip` (deploy target)

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
- `.env.production` → droplet `.env`: `POSTGRES_*`, `ENCRYPTION_KEY`, `DOMAIN`
- `.env.production.local` → droplet `.env.local`: `AUTH_SECRET`, `AUTH_TRUST_HOST`, `AUTH_URL`, optional `AUTH_GOOGLE_*`

Pass both to the first `deploy.sh` run via `--env` / `--env-local` (see [deploy-local.md](./deploy-local.md)). Omit on later deploys — they never overwrite droplet env.

## One-off owner seed
Run once, after the first deploy, to create the admin user:
```bash
scp -i <ssh-key> .env.init root@<host>:/opt/backflip/.env.init
ssh -i <ssh-key> root@<host> 'cd /opt/backflip && docker compose --project-directory . -f devops/compose.prod.yml run --rm --no-deps app corepack yarn init-owner && rm .env.init'
```

## Troubleshooting
- `Permission denied (publickey)` → `chmod 600 <ssh-key>`.
- Ran `ufw` changes and lost SSH access? Reboot the droplet from the DigitalOcean console — `ufw` always allows SSH by default here, but a manual firewall edit outside this script can still lock you out.
- Safe to re-run `setup-droplet.sh` any time — it only installs/configures what's missing.
