#!/bin/sh
# Nightly Postgres backup — runs forever, dumps at 02:15 IST (20:45 UTC),
# prunes files older than BACKUP_RETENTION_DAYS. Writes to /backup which
# should be a mounted volume that survives container restarts.
#
# For off-site retention, add an rclone / aws-cli step at the marked spot
# to sync /backup to S3/R2/B2 — see ops/backup/README.md.

set -eu

BACKUP_DIR=${BACKUP_DIR:-/backup}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

mkdir -p "$BACKUP_DIR"

# Cron-less loop: sleep until the next scheduled time, then dump. Two
# reasons over cron: (1) tiny image doesn't need cron; (2) logs go to
# container stdout which our docker-compose already rotates.
run_backup() {
  ts=$(date -u +%Y%m%dT%H%M%SZ)
  file="$BACKUP_DIR/${PGDATABASE}-${ts}.sql.gz"
  echo "[$(date -u +%FT%TZ)] Starting backup → $file"
  # -Fp: plain SQL (portable) · -c: DROP first for a clean restore
  pg_dump -Fp -c --if-exists | gzip -9 > "$file"
  echo "[$(date -u +%FT%TZ)] Backup done: $(du -h "$file" | awk '{print $1}')"

  # ── OFF-SITE UPLOAD HOOK ────────────────────────────────────────────────
  # Uncomment + configure to ship the dump to durable object storage.
  # rclone copy "$file" "r2:sp-backups/db/" --config /etc/rclone/rclone.conf
  # aws s3 cp "$file" "s3://sp-backups/db/"

  # Prune old dumps.
  echo "[$(date -u +%FT%TZ)] Pruning dumps older than ${RETENTION_DAYS} days"
  find "$BACKUP_DIR" -name "${PGDATABASE}-*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
}

seconds_until_next_run() {
  # Fire at 20:45 UTC daily (02:15 IST). Uses awk because busybox date can't
  # do the arithmetic without GNU coreutils.
  now=$(date -u +%s)
  target=$(date -u -d "$(date -u +%Y-%m-%dT20:45:00Z)" +%s 2>/dev/null || echo "")
  if [ -z "$target" ]; then
    # Alpine busybox `date` can't -d — fall back to computing manually.
    target=$(awk -v now="$now" 'BEGIN {
      # seconds since midnight UTC
      today_sec = now % 86400
      target = now - today_sec + (20*3600 + 45*60)
      if (target <= now) target += 86400
      print target
    }')
  fi
  if [ "$target" -le "$now" ]; then
    target=$((target + 86400))
  fi
  echo $((target - now))
}

echo "[$(date -u +%FT%TZ)] Backup sidecar started (retention: ${RETENTION_DAYS}d)"

# Fire once immediately on first boot so a fresh deployment always has at
# least one snapshot before the first scheduled window.
run_backup || echo "[warn] initial backup failed — will retry on schedule"

while :; do
  wait_for=$(seconds_until_next_run)
  echo "[$(date -u +%FT%TZ)] Next backup in ${wait_for}s"
  sleep "$wait_for"
  run_backup || echo "[warn] backup failed — will retry tomorrow"
done
