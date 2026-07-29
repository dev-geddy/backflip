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
./devops/deploy-for-pm2.sh -h <host> -i <ssh-key> -d <domain>
```

## Fast deploys: build locally
`deploy-for-pm2-build-locally.sh` (same flags) builds on your machine, ships a
~13M artifact, extracts it into the inactive slot and flips — no `yarn install`
or build on the droplet. Migrations run from your machine through an SSH tunnel
(droplet Postgres is loopback-only). Guard aborts if the artifact contains
non-portable native binaries (fall back to `deploy-for-pm2.sh`).
```bash
./devops/deploy-for-pm2-build-locally.sh -h <host> -i <ssh-key> -d <domain>
```

## What happens (blue/green)
1. rsyncs the repo to `/var/www/<domain>` on the droplet (droplet-build flavor only)
2. `yarn install`
3. ensures the db is up (pm2 flavor: `pg_isready` for native postgres, compose up + health wait for docker db; docker flavor: compose up + health wait)
4. `yarn workspace web build` (Next standalone)
5. runs Drizzle migrations
6. assembles the release into the **inactive slot** (`blue/` or `green/` — the one `current` doesn't point at), links `shared -> ../shared`
7. flips the `current` symlink to the new slot — the go-live moment
8. `pm2 startOrRestart` the app
9. proxy: docker flavor renders + reloads Caddy; pm2 flavor leaves nginx alone (setup owns it)
10. health-checks (pm2 online + HTTP on :80)

Any failure before the flip leaves the previous slot serving untouched.
`/var/www/<domain>/shared` is persistent instance data (future admin file
uploads) — deploys never modify it.

## Skip migrations
Add `--skip-migrations` to skip step 5 (e.g. deploying an unrelated hotfix):
```bash
./devops/deploy-for-pm2.sh -h <host> -i <ssh-key> -d <domain> --skip-migrations
```

## Rollback
Flip back to the previous slot (code only — migrations are not reverted):
```bash
./devops/rollback-for-pm2.sh -h <host> -i <ssh-key> -d <domain>
```
Refuses if the other slot is empty (e.g. right after the very first deploy).
Clean path — redeploy an older ref (rebuilds that version, env untouched):
```bash
git checkout <ref>
./devops/deploy-for-pm2.sh -h <host> -i <ssh-key> -d <domain>
```
