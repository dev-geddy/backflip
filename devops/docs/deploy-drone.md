# Deploy via Drone CI

`.drone.yml` holds two pipelines:

| Pipeline | Trigger | Does |
|---|---|---|
| `ci` | push, pull_request | `yarn install --immutable` → `typecheck` → `lint`. No secrets, no droplet access. |
| `deploy` | promote → `production` | Builds the artifact and ships it (below). |

`ci` is not only for the checks: Drone does not record a build when every pipeline is filtered out,
so with a promote-only file alone there is never a build number to promote. `ci` gives each master
commit one.

Pipeline: `deploy` — a thin wrapper over `devops/deploy-for-pm2-build-locally.sh`. Runs on promotion to `production`.

The build happens **on the Drone runner** (`node:24-bookworm-slim`): `corepack yarn install` → typecheck → Next standalone build → tarball artifact. Only the artifact ships to the droplet; migrations run from the runner through an ssh tunnel (droplet Postgres is loopback-only). The droplet needs no Node deps, no build — same blue/green flip and rollback semantics as every pm2-flavor deploy.

Matches the pm2 droplet flavor (`setup-droplet-for-pm2.sh`). The runner image is Debian (glibc) on purpose — the artifact's traced `node_modules` must match the droplet's Ubuntu; don't swap in an alpine image.

## Secrets
| Secret | What | Required? |
|---|---|---|
| `deploy_host` | Droplet host/IP | always |
| `deploy_domain` | Instance domain (deploy dir /var/www/<domain>) | always |
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
drone build ls <repo> --limit 5                 # find the build for the commit you want live
drone build promote <repo> <build> production
```
This is the deploy trigger — the `deploy` pipeline only runs on a `promote` event targeting the `production` environment, not on regular pushes. Promote the build number produced by `ci` for that commit.

## Rollback
From any machine with the droplet key:
```bash
./devops/rollback-for-pm2.sh -h <host> -i <ssh-key> -d <domain>
```
