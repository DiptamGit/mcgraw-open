# McGraw Open 2026 - Technical Decisions

This file records cross-cutting engineering decisions. Product and tournament
rules live in `SPEC.md`; implementation status lives in `WORK_ITEMS.md`.

## Application architecture

- Use the current stable Next.js App Router release supported by Vercel at the
  time MGO-001 starts. Do not use canary releases or experimental framework
  features without a specific need.
- Use TypeScript in strict mode and Tailwind CSS.
- Use npm consistently and commit `package-lock.json`.
- Pin the supported Node.js LTS version in `.nvmrc` and `package.json#engines`.
- Prefer React Server Components. Add client components only around interactive
  controls such as filters, forms, dialogs, and pending states.
- Use server actions for form mutations. Use route handlers only when an HTTP
  boundary is materially clearer, such as a dedicated unlock endpoint.
- Do not add a separate application API, global client state library, or
  client-side Supabase data layer.
- Validate action input and JSON database values at trust boundaries with Zod
  plus focused tennis-score validation helpers.

## Supabase environments and workflow

Use three isolated environments:

1. **Local:** Supabase CLI with Docker for schema work, seeds, integration
   tests, and destructive testing.
2. **Staging:** A cloud Supabase project used only by Vercel preview
   deployments.
3. **Production:** A separate cloud Supabase project containing live
   tournament data.

Additional rules:

- `supabase/migrations/` is the source of truth. Do not make untracked schema
  changes through the Supabase dashboard.
- Test migrations with a full local reset before applying them to staging or
  production.
- Apply the same ordered migrations to every environment.
- Never run production migrations automatically from a Vercel build. Apply and
  verify them as a deliberate release step before deploying code that requires
  the new schema.
- Prefer backward-compatible migrations so the currently deployed application
  continues to work during the release transition.
- Keep generated database TypeScript types committed and regenerate them after
  schema changes.
- Use `@supabase/supabase-js` from server-only modules. Supabase Auth/SSR helpers
  are unnecessary because year one has no user accounts.
- The service-role key is server-only and may never use a `NEXT_PUBLIC_`
  variable.
- Public reads use RLS-protected access. Privileged writes happen only after
  organizer-cookie validation.
- Validate the `sets` JSON shape when reading and writing; generated database
  types alone do not make JSON content trustworthy.
- Privileged SQL functions must set a fixed `search_path`, revoke execution
  from `public`, `anon`, and `authenticated`, and grant only the minimum
  required role.
- Keep Vercel functions and both cloud Supabase projects in compatible nearby
  US regions to minimize latency. Select exact regions during MGO-002/MGO-003
  based on current provider availability.

## Data freshness and concurrency

- The dataset is tiny and correctness matters more than caching. Default public
  tournament reads to fresh dynamic server rendering rather than ISR or a
  client cache.
- Mutations must refresh affected server-rendered routes immediately.
- Use `updated_at` optimistic concurrency for editable records.
- Use transactional SQL functions for multi-row transitions.
- Database triggers create row-level audit history in the same transaction as
  the affected data.

## Organizer security

- A correct shared PIN creates a signed, HttpOnly, SameSite organizer cookie.
  Use a maintained JOSE/Web Crypto implementation; do not invent a signing
  format.
- Cookies are Secure in production, expire after 7 days, and contain no raw
  PIN.
- Include a fingerprint/version derived from the current PIN so rotating the
  PIN invalidates existing cookies.
- Validate the organizer cookie and request origin on every mutation.
- Rate-limit unlock attempts per privacy-preserving client key. The default
  target is five failures per 15 minutes, but the backing implementation is
  finalized in MGO-009 after checking current Vercel capabilities. Prefer the
  existing Supabase stack over adding another hosted service.
- Add baseline security headers before launch. Keep Content Security Policy
  strict but test it against Next.js/Vercel behavior rather than copying a
  brittle template.
- Never log secrets, raw PINs, organizer cookies, or service-role credentials.

## CI, previews, and deployment

- Host the Git repository on GitHub and use GitHub Actions for `npm ci`, lint,
  automated tests, and production build checks.
- Vercel preview deployments use staging Supabase credentials and a non-
  production organizer PIN.
- Vercel production uses only production Supabase credentials.
- CI and preview builds must never query or mutate production.
- Automated database integration tests use an isolated local Supabase instance,
  not the shared staging project.
- Shared staging data is for manual preview validation and should be reset or
  reseeded deliberately when a migration changes its shape.
- Do not perform database reads during `next build`; database pages should be
  runtime-rendered.
- Take a readable production export before applying a production migration and
  before the tournament starts.
- Use structured Vercel server logs with action/match identifiers and sanitized
  errors. Add an external monitoring service only if production experience
  shows the need.

## Test strategy

- Use Vitest for pure score validation, standings, formatting, and other domain
  logic.
- Use the local Supabase stack for migration, constraint, RLS, trigger, and RPC
  integration tests.
- Add a small Playwright suite before the group-stage launch for critical
  public and organizer workflows.
- Extend Playwright coverage for bracket progression before the knockout
  release.
- Automated tests never run against production.

## Frontend and design implementation

- MGO-006 begins with a brief two-pass design plan using the installed
  frontend-design and UI/UX Pro Max guidance. Persist the approved palette,
  typography, layout rules, and signature element in a small `DESIGN.md`.
- Define design tokens as CSS custom properties and expose them through
  Tailwind. Avoid scattering arbitrary colors and spacing values.
- Use `next/font` so chosen fonts are optimized and do not require a runtime
  request to a font CDN.
- Do not add a full component library by default. Prefer semantic HTML, native
  controls, and small accessible headless primitives only where they solve a
  real interaction problem.
- Target current iOS Safari and Android Chrome first, followed by current
  desktop Safari, Chrome, Firefox, and Edge.
- Meet WCAG AA contrast, provide visible keyboard focus, respect reduced
  motion, and target at least 44px touch controls for court-side phone use.
- Optimize for bright outdoor conditions: strong contrast, restrained motion,
  concise screens, and no information conveyed by color alone.
- Render standings and brackets as accessible DOM content, not canvas-only
  graphics. A table may scroll inside its own labeled container, but the page
  itself must not overflow horizontally.
- Avoid offline/PWA complexity in year one. Preserve form input and provide
  clear retry behavior when a mobile network request fails.

## Decisions intentionally deferred

- **MGO-001:** Exact stable Node.js, Next.js, React, and Tailwind versions after
  checking current Vercel support.
- **MGO-002/MGO-003:** Exact Vercel, staging Supabase, and production Supabase
  regions.
- **MGO-006:** Visual direction, fonts, logo treatment, and whether the user has
  existing tournament artwork or photography.
- **MGO-009:** Concrete rate-limit storage mechanism after evaluating current
  Vercel features against a small Supabase-backed limiter.
- **MGO-010:** Maintained timezone library for converting
  `datetime-local` values to/from America/Chicago. Do not hand-roll DST logic.
- **MGO-018:** Production domain, final PIN, backup capability available on the
  chosen Supabase plan, and whether lightweight analytics are desired.
