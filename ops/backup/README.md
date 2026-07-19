# Postgres backups

The `db-backup` service in `docker-compose.prod.yml` runs `pg_dump` nightly
at **02:15 IST (20:45 UTC)** and writes gzipped SQL to `./ops/backup/` on
the host. Files older than `BACKUP_RETENTION_DAYS` (default: 30) are pruned.

## What's backed up

Everything in the `specialparent` schema — every model in
[`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma). That
includes users, children, milestones, therapy sessions, mood + behavior
events, IEPs, messages, documents metadata, notifications, audit logs.

**Not** included:
- Redis (cache only — recomputable)
- Uploaded files on local disk (`backend/uploads/`) — either mount that
  volume to durable storage or move to Cloudinary (set `CLOUDINARY_URL`)
- Application secrets in `.env` — those live in your secrets manager

## Restore

```sh
# Pick the dump you want
ls -lh ops/backup/

# Restore into a running Postgres. --clean flag in pg_dump means the file
# already contains DROP statements — do NOT drop the DB manually first.
gunzip -c ops/backup/specialparent-20260201T204500Z.sql.gz \
  | docker exec -i specialparent-postgres psql -U specialparent -d specialparent

# Bounce backend to reconnect and refresh Prisma cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart backend
```

Test restore quarterly. A backup you have never restored is a backup you
don't have.

## Off-site copies

Local disk backups don't survive a host loss. Uncomment the `rclone` or
`aws s3 cp` line in [`entrypoint.sh`](./entrypoint.sh) and mount your
credentials into the sidecar. Suggested targets:

- **Cloudflare R2** (~$0.015/GB/month, zero egress fees) — cheapest for
  small teams
- **AWS S3 with Glacier lifecycle** — cheaper long-term if you keep
  years of history
- **Backblaze B2** — well-supported by rclone

Add the mount to `docker-compose.prod.yml`:

```yaml
db-backup:
  volumes:
    - ./ops/backup:/backup
    - ./ops/backup/entrypoint.sh:/entrypoint.sh:ro
    - ./ops/backup/rclone.conf:/etc/rclone/rclone.conf:ro
```

## Monitoring

The sidecar logs `Starting backup` and `Backup done` on every run. Point
your log aggregator (Loki, CloudWatch, Datadog) at those lines and alert
if you don't see them for >26 hours — that means the sidecar died or the
schedule stopped firing.
