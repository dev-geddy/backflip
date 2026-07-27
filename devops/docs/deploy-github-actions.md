# Deploy via GitHub Actions

Workflow: `.github/workflows/deploy.yml` — a thin wrapper over `devops/deploy.sh`.

## Secrets
Set under **Settings → Secrets and variables → Actions**.

| Secret | What | Required? |
|---|---|---|
| `DEPLOY_HOST` | Droplet host/IP | always |
| `DEPLOY_SSH_KEY` | Private SSH key, no passphrase | always |
| `DEPLOY_ENV` | Full contents of `.env.production` | first deploy / env changes only |
| `DEPLOY_ENV_LOCAL` | Full contents of `.env.production.local` | first deploy / env changes only |

Get key contents:
```bash
cat ~/.ssh/id_ed25519
```

## Run it
**Actions** tab → **Deploy** workflow → **Run workflow**.

## Auto-deploy on push to main
The workflow only runs manually (`workflow_dispatch`) by default. To deploy on every push to `main`, uncomment the `push` trigger at the top of `.github/workflows/deploy.yml`.
