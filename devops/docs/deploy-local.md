# Deploy from your machine

Two deploy scripts, matching the droplet flavor (see [droplet-setup.md](./droplet-setup.md)):
- `deploy-for-pm2.sh` — pm2-flavor droplet (nvm node, nginx; db native or docker)
- `deploy-for-docker.sh` — docker-flavor droplet (apt node, Caddy, docker db)

Both take the same flags. Examples below use `deploy-for-pm2.sh` — swap the
name for the docker flavor.

## Prerequisites
- `bash`, `ssh`, `rsync` installed locally
- Droplet already provisioned (see [droplet-setup.md](./droplet-setup.md))

## First deploy
Uploads env files too — needed once, or whenever env changes:
```bash
./devops/deploy-for-pm2.sh -h <host> -i <ssh-key> --env .env.production --env-local .env.production.local
```

## Subsequent deploys
```bash
./devops/deploy-for-pm2.sh -h <host> -i <ssh-key>
```

## What happens
1. rsyncs the repo to `/opt/backflip` on the droplet
2. `yarn install`
3. ensures the db is up (pm2 flavor: `pg_isready` for native postgres, compose up + health wait for docker db; docker flavor: compose up + health wait)
4. `yarn workspace web build` (Next standalone)
5. runs Drizzle migrations on the host
6. copies the standalone bundle to a timestamped release dir (`/opt/backflip/.releases/<ts>`), flips the `current` symlink
7. `pm2 startOrRestart` the app
8. proxy: docker flavor renders + reloads Caddy; pm2 flavor leaves nginx alone (setup owns it)
9. prunes releases, keeping the last 3
10. health-checks (pm2 online + HTTP on :80)

Install/build/migration failures abort before the symlink flip — the live app keeps serving the previous release from `.releases/current` throughout.

## Skip migrations
Add `--skip-migrations` to skip step 5 (e.g. deploying an unrelated hotfix):
```bash
./devops/deploy-for-pm2.sh -h <host> -i <ssh-key> --skip-migrations
```

## Rollback
Fast path — repoint the symlink to a previous release, no rebuild:
```bash
ssh -i <ssh-key> root@<host> 'ln -sfn /opt/backflip/.releases/<ts> /opt/backflip/.releases/current && . .nvm/nvm.sh 2>/dev/null; pm2 restart backflip'
```
Clean path — redeploy an older ref (rebuilds and redeploys that version, env files untouched):
```bash
git checkout <ref>
./devops/deploy-for-pm2.sh -h <host> -i <ssh-key>
```
