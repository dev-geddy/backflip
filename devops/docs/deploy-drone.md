# Deploy via Drone CI

Pipeline: `.drone.yml` — a thin wrapper over `devops/deploy.sh`. Runs on promotion to `production`.

## Secrets
| Secret | What | Required? |
|---|---|---|
| `deploy_host` | Droplet host/IP | always |
| `deploy_ssh_key` | Private SSH key, no passphrase | always |
| `deploy_env` | Full contents of `.env.production` | first deploy / env changes only |
| `deploy_env_local` | Full contents of `.env.production.local` | first deploy / env changes only |

Add via Drone CLI:
```bash
drone secret add <repo> --name deploy_host --data <host>
drone secret add <repo> --name deploy_ssh_key --data @path/to/key
```
Or under the repo's **Settings → Secrets** in the Drone UI.

## Run it
```bash
drone build promote <repo> <build> production
```
This is the deploy trigger — the pipeline only runs on a `promote` event targeting the `production` environment, not on regular pushes.
