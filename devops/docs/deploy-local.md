# Deploy from your machine

## Prerequisites
- `bash`, `ssh`, `rsync` installed locally
- Droplet already provisioned (see [droplet-setup.md](./droplet-setup.md))

## First deploy
Uploads env files too — needed once, or whenever env changes:
```bash
./devops/deploy.sh -h <host> -i <ssh-key> --env .env.production --env-local .env.production.local
```

## Subsequent deploys
```bash
./devops/deploy.sh -h <host> -i <ssh-key>
```

## What happens
1. rsyncs the repo to `/opt/backflip` on the droplet
2. builds the app image on the droplet
3. runs Drizzle migrations in-container
4. brings up the stack (`docker compose up -d`)
5. health-checks the app

## Skip migrations
Add `--skip-migrations` to skip step 3 (e.g. deploying an unrelated hotfix):
```bash
./devops/deploy.sh -h <host> -i <ssh-key> --skip-migrations
```

## Rollback
```bash
git checkout <ref>
./devops/deploy.sh -h <host> -i <ssh-key>
```
Redeploying an older ref rebuilds and redeploys that version. Env files are untouched.
