# Deployment

Deploy backflip to a DigitalOcean droplet with one script — from your machine, GitHub Actions, or Drone CI. Scripts live in `devops/`; one doc below per build setup.

## Prerequisites
- A DigitalOcean droplet (Ubuntu LTS), running, root SSH access
- Your local SSH private key for that droplet
- A domain with an A record pointing at the droplet's IP

## Quick start
```bash
cp devops/env/production.env.example .env.production             # fill in values
cp devops/env/production.env.local.example .env.production.local  # fill in values
./devops/setup-droplet.sh -h <host> -i <ssh-key>
./devops/deploy.sh -h <host> -i <ssh-key> --env .env.production --env-local .env.production.local
```
App is live at `https://<domain>`.

## Docs
| Doc | Covers |
|---|---|
| [devops/docs/droplet-setup.md](./devops/docs/droplet-setup.md) | One-time droplet provisioning, env files, owner seed |
| [devops/docs/deploy-local.md](./devops/docs/deploy-local.md) | Deploying from your own machine |
| [devops/docs/deploy-github-actions.md](./devops/docs/deploy-github-actions.md) | Deploying via GitHub Actions |
| [devops/docs/deploy-drone.md](./devops/docs/deploy-drone.md) | Deploying via Drone CI |
