# Storage Backup & Restore Runbook

## Scope
- Production object storage (S3/R2) used by slide originals, generated PDFs, thumbnails.
- PostgreSQL metadata in `slides.file_url`, `slides.pdf_url`, `slides.thumbnail_url`.

## Preconditions
- `STORAGE_DRIVER` is `s3` or `r2`.
- `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` are set.
- `CLAMAV_REQUIRED=true` in production.

## Backup Strategy
1. Daily object storage backup job
- Mirror bucket to backup bucket with versioning enabled.
- Keep at least 30 days retention.

2. Daily PostgreSQL backup
- Logical dump (`pg_dump`) + point-in-time recovery enabled.
- Retention: 30 days minimum.

3. Consistency snapshot (weekly)
- Export list of all referenced URLs from DB.
- Compare with object listing in storage bucket.
- Alert on missing or orphaned objects.

## Restore Procedure
1. Incident triage
- Identify affected key prefixes (`slides/`, `pdfs/`, `thumbnails/`).
- Identify impacted rows in DB.

2. Restore objects
- Restore from latest valid backup snapshot/version to original keys.
- Validate object count and checksum if available.

3. Verify DB references
- Run SQL check for unresolved URLs.
- Re-run conversion/rebuild thumbnails for missing generated artifacts.

4. App-level verification
- Open random 20 slide detail pages and preview PDFs.
- Verify upload, delete, and conversion pipeline endpoints.

## Recovery Commands (example)
- List DB-referenced storage keys
```sql
SELECT file_url, pdf_url, thumbnail_url
FROM slides
WHERE deleted_at IS NULL;
```

- Requeue pending/missing conversions
- Trigger startup reconciler or wait for `CONVERSION_RECONCILE_INTERVAL_MS`.

## Manual Restore Drill (Launch Gate)
Run at least once before production launch and then monthly.

1. Drill setup
- Pick one known slide (`slide_id`) with existing original, PDF, thumbnail.
- Record current object keys and DB URLs.
- Enable maintenance window for test environment.

2. Simulate loss
- Move one object (example: thumbnail key) to quarantine prefix.
- Confirm app shows degradation (thumbnail missing) while DB still references old key.

3. Execute restore
- Restore object from backup snapshot/version to original key.
- If object is unrecoverable, trigger conversion requeue to regenerate PDF/thumbnail.

4. Verify
- `GET /api/slides/:id/pdf` returns 200.
- Slide detail payload has non-empty `thumbnailUrl`.
- Open UI preview and confirm image rendered.

5. Evidence
- Save run timestamp, operator, slide id, object keys, restore source version, and verification screenshots/logs.
- Store record in `docs/runbooks/storage-restore-drill-log.md`.

6. Fail criteria (Launch blocker)
- Restore cannot recover object within agreed RTO.
- DB URLs remain broken after restore/requeue.
- Queue reconcile cannot repair missing generated artifact.

## Rollback
- If restore causes mismatch, rollback to previous object backup snapshot.
- Keep application in read-only upload mode during rollback window.

## Monitoring
- Alert when:
  - conversion queue missing-job reconciler re-enqueue count spikes
  - object delete failures > threshold
  - 404 rate on `/api/slides/:id/pdf` increases

## Owners
- Primary: Backend/Platform
- Secondary: DevOps/SRE
