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
2. `yarn install`
3. brings up the db + waits for health
4. `yarn workspace web build` (Next standalone)
5. runs Drizzle migrations on the host
6. copies the standalone bundle to a timestamped release dir (`/opt/backflip/.releases/<ts>`), flips the `current` symlink
7. `pm2 startOrRestart` the app
8. renders + reloads Caddy
9. prunes releases, keeping the last 3
10. health-checks (pm2 online + HTTP on :80)

Install/build/migration failures abort before the symlink flip — the live app keeps serving the previous release from `.releases/current` throughout.

## Skip migrations
Add `--skip-migrations` to skip step 5 (e.g. deploying an unrelated hotfix):
```bash
./devops/deploy.sh -h <host> -i <ssh-key> --skip-migrations
```

## Rollback
Fast path — repoint the symlink to a previous release, no rebuild:
```bash
ssh -i <ssh-key> root@<host> 'ln -sfn /opt/backflip/.releases/<ts> /opt/backflip/.releases/current && pm2 restart backflip'
```
Clean path — redeploy an older ref (rebuilds and redeploys that version, env files untouched):
```bash
git checkout <ref>
./devops/deploy.sh -h <host> -i <ssh-key>
```
