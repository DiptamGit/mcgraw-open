# Deployment

## Regions

- Vercel Functions: Washington, D.C. (`iad1`)
- Staging Supabase: East US, North Virginia (`us-east-1`)
- Production Supabase: East US, North Virginia (`us-east-1`)

Keep staging and production in separate Supabase projects. The matching
East Coast regions minimize application-to-database latency.

## One-time setup

1. Create separate staging and production Supabase projects in `us-east-1`.
2. Import this GitHub repository into Vercel with `main` as the production
   branch. Vercel detects the Next.js framework and reads `vercel.json`.
3. In Vercel project settings, add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` twice:
   - Preview scope: values from the staging Supabase project only.
   - Production scope: values from the production Supabase project only.
4. Do not expose the service-role key with a `NEXT_PUBLIC_` prefix or add
   production values to Preview or Development.
5. Require the GitHub Actions `Quality` check for pull requests before merge.

The current placeholder does not read Supabase during `next build`. Future
database code must remain runtime-only and server-only.

## Deploy and verify

- Push a non-`main` branch or open a pull request for a Vercel Preview.
- Merge or push to `main` for a production deployment.
- For a manual production deployment after linking the project, run
  `npx vercel@latest --prod`.
- Compare the deployment's Git commit in Vercel with `git rev-parse HEAD`, then
  open the deployment URL and confirm it serves the McGraw Open placeholder.

Never commit `.env` files, Vercel project metadata, or credential values.
