# Deployment and operations

## Environment isolation

| Environment | Database | Application |
|---|---|---|
| Local | Local Supabase Docker stack | `npm run dev` |
| Preview | `mcgraw-open-staging` in `us-east-1` | Vercel Preview |
| Production | `mcgraw-open-production` in `us-east-1` | `https://macgraw-open-website-mcgraw-open.vercel.app` |

Vercel Functions run in Washington, D.C. (`iad1`). Never copy Production
Supabase values into Preview or Development, and never use the production
project for automated tests. Traffic analytics are intentionally disabled for
year one.

Each Vercel scope needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `ORGANIZER_PIN`, and
`ORGANIZER_COOKIE_SECRET`. The service-role key, PIN, and cookie secret are
server-only and must not use a `NEXT_PUBLIC_` prefix. Use different PINs and
independently generated cookie secrets of at least 32 characters in Preview and
Production.

## Production release

1. Confirm the intended commit is on `main` and all GitHub Actions checks pass.
2. Run `npx vercel@latest env ls` and verify all five required variables exist
   in Production without printing their values.
3. Link the Supabase CLI to the production project in a dedicated release
   directory. Do not repoint the local development directory.
4. Export both schema and data before applying migrations:

   ```sh
   npx supabase db dump --linked --file backups/pre-release-schema.sql
   npx supabase db dump --linked --data-only --use-copy \
     --file backups/pre-release-data.sql
   ```

5. Verify both files are readable and store them outside the repository in
   access-controlled storage.
6. Review `npx supabase migration list --linked`, then run
   `npx supabase db push --linked --dry-run`.
7. Apply the reviewed migrations with `npx supabase db push --linked`. The 2026
   seed migration is idempotent and inserts the 11 teams, 25 group fixtures,
   and seven knockout placeholders. Do not run `supabase db reset` against
   Production.
8. Query counts before deploying: 11 teams, 25 group matches, seven knockout
   matches, and one tournament-state row.
9. Deploy the reviewed commit with `npx vercel@latest --prod`, then confirm the
   stable production alias points to that deployment.
10. Smoke-test Home, Groups, Matches, Bracket, organizer unlock, scheduling,
    normal scores, retirement, walkover, clearing results, group finalization
    safeguards, quarterfinal assignment, semifinal/final assignment, upstream
    result locks, and eligible downstream clears. Restore any fixture changed
    solely for the smoke test.
11. Take a post-release schema and data export as the initial tournament
    snapshot and verify both files are readable.

Migrations are never run by `next build` or Vercel. Production database changes
remain a separate, backed-up release step.

## Routine operations

### Change the organizer PIN

Replace `ORGANIZER_PIN` only in the intended Vercel environment, then redeploy.
Existing organizer cookies become invalid automatically because their version
is derived from the configured PIN. Never put the PIN in a command argument,
log, issue, commit, or audit note.

### Review audit history

Use the Supabase SQL editor while signed in to the intended project:

```sql
select id, action, entity_type, entity_key, before_data, after_data, created_at
from public.audit_log
order by created_at desc, id desc
limit 100;
```

Audit history is server-only. Do not expose it through a public page or share
an export containing organizer operational data.

### Apply later migrations

Repeat the production release backup, migration-list, dry-run, and push steps.
Apply migrations before deploying code that requires them, and keep migrations
backward compatible with the currently deployed application.

### Export a backup

Export schema and data separately with the commands above. Name the directory
with a UTC timestamp, keep it outside the repository, and confirm each file is
non-empty and readable before treating the backup as complete.

### Recover from a failed deployment

Use `npx vercel@latest rollback <deployment-url>` to restore the last known-good
application deployment. Do not reverse or reset the production database
automatically. If a database restore is required, stop writes, preserve a fresh
incident export, review the migration and data-loss impact, and restore from
the verified backup deliberately through Supabase.

Never commit `.env` files, Vercel project metadata, database dumps, or
credential values.
