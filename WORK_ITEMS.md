# McGraw Open 2026 - Work Items

This is the authoritative implementation tracker. Product rules live in
`SPEC.md`.

## How to use this tracker

- Status values: **Not started**, **In progress**, **Blocked**, **Done**.
- The Current queue table is the only place where item status is recorded.
- Work on one item per session unless the user explicitly expands the scope.
- Start only when every listed dependency is **Done**.
- Change the item's status before starting and after completing it.
- Add a short note when an item is blocked or when implementation differs from
  the written scope.
- A slice is complete only when its acceptance criteria and validation steps
  pass, `npm run build` succeeds, and the working version is committed.
- Deploy each completed slice when Vercel and Supabase access are available.
- Show every database migration to the user before applying it.
- Every UI or UX item must read and follow the locked system in `DESIGN.md`.
  `DESIGN.md` v2.0 (Night Match) is the current locked system. Foundational
  deviations require explicit user approval and an update to `DESIGN.md` first.

## Current queue

| ID | Work item | Status | Depends on |
|---|---|---|---|
| MGO-001 | Scaffold the application | Done | - |
| MGO-002 | Establish baseline deployment | Done | MGO-001 |
| MGO-003 | Create the database schema | Done | MGO-001 |
| MGO-004 | Seed teams and tournament matches | Done | MGO-003 |
| MGO-005 | Build the typed server data layer | Done | MGO-003, MGO-004 |
| MGO-006 | Build the mobile app shell | Done | MGO-001 |
| MGO-007 | Show live matches read-only | Done | MGO-005, MGO-006 |
| MGO-008 | Organize and filter matches | Done | MGO-007 |
| MGO-009 | Add the shared PIN gate | Done | MGO-005, MGO-006 |
| MGO-010 | Schedule and reschedule matches | Done | MGO-008, MGO-009 |
| MGO-011 | Enter and edit normal scores | Done | MGO-008, MGO-009 |
| MGO-012 | Record retirements and walkovers | Done | MGO-011 |
| MGO-013 | Implement the standings engine | Done | MGO-005, MGO-012 |
| MGO-014 | Build the groups standings page | Done | MGO-006, MGO-013 |
| MGO-015 | Finalize and reopen group standings | Done | MGO-009, MGO-014 |
| MGO-016 | Build the tournament home page | Done | MGO-007, MGO-014 |
| MGO-017 | Harden the group-stage release | Done | MGO-010, MGO-012, MGO-015, MGO-016 |
| MGO-018 | Launch the group-stage site | Done | MGO-002, MGO-017 |
| MGO-019 | Render the knockout bracket | Done | MGO-005, MGO-006, MGO-018 |
| MGO-020 | Assign finalized teams to quarterfinals | Done | MGO-015, MGO-019 |
| MGO-021 | Administer semifinal and final assignments | Done | MGO-011, MGO-019, MGO-020 |
| MGO-022 | Harden and release the knockout stage | Done | MGO-018, MGO-021 |
| MGO-023 | Expand Group A roster and fixtures | Done | MGO-022 |
| MGO-024 | Rebuild the design foundation and app shell | Done | MGO-023 |
| MGO-025 | Rebuild the matches list and shared match presentation | Done | MGO-024 |
| MGO-026 | Rebuild the group standings page | Done | MGO-024, MGO-025 |
| MGO-027 | Rebuild the home page and cinematic hero | Done | MGO-025, MGO-026 |
| MGO-028 | Rebuild the knockout bracket signature | Done | MGO-024, MGO-025 |
| MGO-029 | Rebuild the organizer forms and transition pages | Done | MGO-024, MGO-025 |
| MGO-030 | Harden and release the interface overhaul | Not started | MGO-027, MGO-028, MGO-029 |

## Phase 1 - Foundation

### MGO-001 - Scaffold the application

**Goal:** Create the smallest runnable foundation for all later slices.

**Scope:**

- Initialize Git if the folder is not already a repository.
- Scaffold the current stable Vercel-supported Next.js release with the App
  Router, strict TypeScript, Tailwind CSS, and the repository's standard
  linting setup. Do not use canary or experimental features.
- Use npm, commit `package-lock.json`, and pin the selected Node.js LTS version
  in `.nvmrc` and `package.json#engines`.
- Add the standard development, lint, and build scripts.
- Replace starter content with a simple McGraw Open placeholder page.
- Add a practical `.gitignore` and `.env.example` without real credentials.

**Acceptance criteria:**

- The site starts locally and shows "McGraw Open 2026."
- No starter branding or unused demo assets remain.
- TypeScript and Tailwind are functioning.
- `npm ci` produces the same dependency tree from the lockfile.
- No secret or machine-specific environment file is tracked.

**Validate:**

- `npm run lint`
- `npm run build`
- Open the home page at mobile and desktop widths.

### MGO-002 - Establish baseline deployment

**Goal:** Make every later slice independently deployable.

**Implementation note:** The GitHub repository was connected and the MGO-001
scaffold was pushed during MGO-001 at the user's request. MGO-002 still owns
GitHub Actions, Vercel, environment isolation, region selection, deployment,
and deployment documentation.

**Scope:**

- Create/connect the GitHub repository and add GitHub Actions checks for
  `npm ci`, lint, automated tests when present, and production build.
- Connect the project to Vercel.
- Configure preview deployments to use the cloud staging Supabase project and
  production deployments to use only the production Supabase project.
- Select compatible nearby US regions for Vercel and both cloud databases.
- Ensure build checks do not query or mutate a database.
- Deploy the placeholder page.
- Document only the minimal deployment commands or dashboard steps needed by
  future sessions.

**Acceptance criteria:**

- A public Vercel URL serves the current placeholder page.
- Preview and production deployments build without local-only assumptions.
- Preview deployments cannot access production data or secrets.
- Required GitHub checks pass before a slice is considered deployable.
- No environment values are committed.

**Validate:**

- Open the public deployment.
- Confirm the deployed commit matches the local completed slice.

**External input:** GitHub, Vercel, staging Supabase, and production Supabase
access may require the user.

### MGO-003 - Create the database schema

**Goal:** Define a secure schema that represents all confirmed tournament
rules before feature code depends on it.

**Scope:**

- Add a versioned Supabase migration for `teams`, `matches`, and a singleton
  tournament-state record that tracks whether groups are open or finalized.
- Initialize the Supabase CLI project for local Docker development.
- Include stable match codes, venue, deciding-set format, outcome type,
  played/completion/update timestamps, final ranks, foreign keys, checks, and
  useful indexes.
- Add a server-only audit table for timestamped mutation before/after values.
- Prefer database triggers for row-level audit capture so the data change and
  its audit record always commit or roll back together.
- Enable Row Level Security.
- Permit public reads while denying direct anonymous writes.
- Keep audit records unavailable to anonymous public reads.
- Reserve server-only credentials for PIN-authorized mutations.
- Generate or define application-facing database types.
- Harden privileged functions with fixed `search_path` and explicit execute
  grants; no privileged RPC may be callable by public, anon, or authenticated
  roles.
- Extend CI with local Supabase migration, reset, constraint, and policy checks
  once the schema exists.

**Acceptance criteria:**

- The migration represents every field and rule currently documented in
  `SPEC.md`.
- Invalid stages, statuses, groups, outcomes, and deciding-set formats are
  rejected by database constraints.
- Completed-match consistency, team/winner relationships, unique match codes,
  and unique final ranks per group are protected by constraints.
- Group fixtures cannot duplicate the same unordered team pairing under a
  different code.
- Scheduled and completed states require their corresponding timestamps and
  result fields, while non-completed states cannot retain stale result data.
- `updated_at` is maintained automatically.
- Browser clients cannot directly insert, update, or delete rows.
- Browser clients cannot read audit records directly.
- Reapplying the project from an empty local database is deterministic.
- A full local `supabase db reset` applies migrations and seed data cleanly.
- CI database checks use an isolated local Supabase instance and never staging
  or production.

**Validate:**

- Show the migration to the user before applying it.
- Apply it to the local Supabase Docker project first.
- Run focused local checks for constraints, RLS, audit triggers, and RPC grants.
- Inspect tables, constraints, indexes, policies, and generated types.
- `npm run build`

**External input:** Docker must be available locally. Staging and production
Supabase access is not required to finish the local schema slice.

### MGO-004 - Seed teams and tournament matches

**Goal:** Produce the complete 2026 tournament fixture set reproducibly.

**Scope:**

- Add an idempotent seed script for the 11 named doubles teams and group
  assignments.
- Generate every unique round-robin pairing: 10 Group A matches and 15 Group B
  matches.
- Give every match a deterministic unique code.
- Insert QF1-QF4, SF1-SF2, and Final placeholders with explicit source-match
  relationships or an equally explicit typed bracket mapping.
- Initialize tournament state as open with no final ranks.
- After local validation, apply the reviewed migrations to staging and seed the
  staging project with the same deterministic fixture set.

**Acceptance criteria:**

- Exactly 11 teams, 25 group matches, and 7 knockout matches exist.
- No team plays itself and no group pairing is duplicated.
- Running the seed again does not create duplicates.
- Knockout labels preserve the fixed A1/B4, A2/B3, A3/B2, A4/B1 mapping.
- Staging has the same migration version and deterministic seed baseline before
  preview data pages are deployed.

**Validate:**

- Run the seed against the local Supabase project.
- Query and count teams and matches by group and stage.
- Spot-check every team's expected number of group matches.
- Apply migrations and seed to staging, then repeat the counts there.
- `npm run build`

**External input:** The user must provide the final team names and group
assignments plus staging Supabase access before this item can be completed.

### MGO-005 - Build the typed server data layer

**Goal:** Give pages and actions one consistent, server-only path to Supabase.

**Scope:**

- Add server-only Supabase clients for public reads and privileged writes.
- Use `@supabase/supabase-js`; do not add Supabase Auth/SSR helpers without a
  new requirement.
- Validate required environment variables with clear startup errors.
- Create typed query functions for teams, matches, and tournament state.
- Add optimistic-concurrency helpers based on `updated_at`.
- Define fresh-data and route-revalidation behavior so mutations are visible
  immediately on Home, Groups, Matches, and Bracket.
- Default tournament reads to fresh dynamic server rendering; do not add ISR or
  client caching for this small dataset.
- Validate form inputs and JSON database values with Zod at trust boundaries.
- Normalize match records into page-friendly types without hiding data errors.
- Keep Supabase access out of client components.

**Acceptance criteria:**

- A server component can read seeded teams and matches through typed helpers.
- Missing configuration fails explicitly.
- Privileged credentials cannot enter the browser bundle.
- Query errors are surfaced rather than converted into empty success states.
- Stale writes are rejected with a clear conflict result instead of silently
  overwriting newer data.
- Trigger-generated audit records commit or roll back with their row changes.

**Validate:**

- Exercise each query against seeded data.
- Inspect the browser bundle/environment for leaked server credentials.
- `npm run lint`
- `npm run build`

## Phase 2 - Public match tracking

### MGO-006 - Build the mobile app shell

**Goal:** Establish the navigation and visual foundation shared by every page.

**Scope:**

- Read and implement the approved visual and interaction system in `DESIGN.md`.
- Use the local frontend-design and UI/UX Pro Max guidance only to execute that
  locked direction or fill a documented component-level gap.
- Add responsive navigation for Home, Groups, Matches, and Bracket.
- Add CSS custom-property design tokens exposed through Tailwind, shared page
  width, typography, focus styles, and active route treatment.
- Load selected fonts with `next/font`.
- Prefer semantic HTML and native controls; do not add a full component library
  without a demonstrated need.
- Keep the design optimized for quick use beside the court.

**Acceptance criteria:**

- All four routes are reachable on a narrow phone without horizontal overflow.
- Navigation has visible focus and active states.
- Primary touch targets are at least 44px and remain legible in bright outdoor
  conditions.
- The visual identity is specific to a local doubles tennis tournament rather
  than a generic dashboard.
- The shell follows the locked tokens, typography, court-line signature,
  surface strategy, shape language, and responsive navigation in `DESIGN.md`.
- Reduced-motion preferences are respected.

**Validate:**

- Test keyboard navigation.
- Review at 320px, 390px, tablet, and desktop widths.
- Review the implementation against `DESIGN.md`.
- `npm run lint`
- `npm run build`

### MGO-007 - Show live matches read-only

**Goal:** Replace the spreadsheet's basic fixture lookup with live database
data.

**Scope:**

- Implement the Matches route as a server-rendered page.
- Show teams, group/stage, status, scheduled time in America/Chicago, venue,
  score, and exceptional outcome where available.
- Use `played_at`, not entry or creation time, for completed-match ordering.
- Add reusable score and match-row presentation helpers.
- Handle knockout placeholders with unassigned teams.

**Acceptance criteria:**

- All 32 seeded matches render from Supabase.
- Unscheduled, scheduled, completed, retirement, and walkover displays are
  unambiguous.
- Match tiebreak scores are visually distinct from full-set scores.
- Empty or missing optional values do not create broken labels.

**Validate:**

- Check representative fixtures in each state.
- Confirm Central Time formatting around date boundaries.
- `npm run lint`
- `npm run build`

### MGO-008 - Organize and filter matches

**Goal:** Make a long fixture list fast to scan on a phone.

**Scope:**

- Group matches by scheduled, unscheduled, and completed status.
- Sort scheduled matches soonest first and completed matches most recent first.
- Add filters for group and knockout stage.
- Keep filter state shareable in the URL.
- Add useful zero-result states.

**Acceptance criteria:**

- Default ordering follows `SPEC.md`.
- Filters can isolate Group A, Group B, quarterfinals, semifinals, and final.
- Reloading or sharing a filtered URL preserves the selected view.
- Controls remain usable on a 320px-wide screen.

**Validate:**

- Exercise each filter and filter combination.
- Test ordering with past and future scheduled dates.
- Test completed ordering with played dates that differ from result-entry time.
- `npm run lint`
- `npm run build`

## Phase 3 - PIN-gated match administration

### MGO-009 - Add the shared PIN gate

**Goal:** Protect every mutation without introducing user accounts.

**Scope:**

- Add a server-side PIN verification mechanism.
- Use a maintained JOSE/Web Crypto implementation; do not create a custom token
  or signing format.
- Exchange a correct PIN for a signed HttpOnly, Secure-in-production, SameSite
  organizer cookie that expires after 7 days.
- Rate-limit failed unlock attempts without creating a global lockout that one
  visitor can trigger for everyone.
- Target five failures per 15 minutes per privacy-preserving client key. If the
  chosen limiter needs schema support, show its migration, test it locally, and
  apply it to staging before preview validation.
- Require and validate the organizer cookie on every server action or mutating
  route handler.
- Use generic failure messages and avoid logging or returning the configured
  PIN.
- Add a clear lock-again action that expires the cookie.
- Reject cross-origin mutation requests.

**Acceptance criteria:**

- Public reads work without a PIN.
- Incorrect or missing PINs cannot mutate data.
- Refreshing an unlocked device preserves edit affordances for up to 7 days.
- Editing from another device remains locked.
- The PIN is never embedded in client JavaScript, stored in localStorage, put
  in the cookie, persisted in Supabase, or written to logs/audit records.
- Repeated failed unlock attempts receive a controlled rate-limit response.
- Changing the configured PIN invalidates previously issued organizer cookies.

**Validate:**

- Attempt each mutation path without a PIN and with a wrong PIN.
- Inspect browser storage, cookies, source, logs, and network responses for the
  configured PIN.
- Verify cookie expiry, logout, SameSite behavior, and rate limiting.
- Rotate the configured PIN and confirm the old cookie no longer authorizes
  mutations.
- `npm run lint`
- `npm run build`

### MGO-010 - Schedule and reschedule matches

**Goal:** Let organizers maintain when and where matches will occur.

**Scope:**

- Add a PIN-gated schedule form for date, time, and free-text venue.
- Interpret entered times in America/Chicago and store them as `timestamptz`.
- Use a maintained timezone library selected during this item; do not hand-roll
  daylight-saving offset conversion.
- Support rescheduling and returning a match to unscheduled.
- Validate required fields and display action errors.
- Reject stale edits using the submitted `updated_at` version.
- Write an audit record and revalidate affected routes after each mutation.

**Acceptance criteria:**

- Scheduling sets status to `scheduled`.
- Rescheduling updates the same match.
- Clearing a schedule removes time and venue and restores `unscheduled`.
- Public match views update after a successful action.
- Invalid or ambiguous input cannot silently alter a match.
- A concurrency conflict preserves the newer stored value and asks the
  organizer to reload.

**Validate:**

- Schedule, reschedule, and unschedule a fixture.
- Verify stored UTC values and displayed Central Time values.
- Verify unauthorized requests fail.
- `npm run lint`
- `npm run build`

### MGO-011 - Enter and edit normal scores

**Goal:** Record normally completed best-of-three matches accurately.

**Scope:**

- Add a PIN-gated score form with explicit winner selection.
- Record whether the deciding set format is a full set or 10-point match
  tiebreak.
- Validate straight-set and three-set results.
- Use standard tiebreak-set rules for full sets and first-to-10-by-two rules for
  match tiebreaks.
- Set outcome to normal and status to completed.
- Support correcting a completed group score while groups remain open, and a
  knockout score until its winner is assigned downstream.
- Allow an unscheduled match to move directly to completed.
- Record an editable played date/time, prefilled from the scheduled time or the
  current Central Time.
- Set `completed_at` when saving, reject stale edits, write an audit record, and
  revalidate affected routes.
- Allow an unlocked result to be cleared. Clear result timestamps and fields,
  then restore `scheduled` when `scheduled_at` exists or `unscheduled`
  otherwise.
- Implement score validation as a pure helper with focused Vitest tests,
  adding Vitest here if the project does not have a test runner.

**Acceptance criteria:**

- Winner, score, deciding-set format, outcome, and status persist together.
- A selected winner must have a valid winning score.
- Full-set and match-tiebreak deciding scores use their correct validation.
- Invalid ties, incomplete sets, impossible winners, and extra sets are
  rejected with actionable messages.
- Editing does not create a second match record.
- Match tiebreak points are not treated as ordinary games.
- Score changes are rejected when a group match is finalized or when a
  knockout winner has already been assigned downstream.
- Completed-match ordering uses the entered played time, not the time the
  result happened to be saved.

**Validate:**

- Test representative straight-set and three-set results for both deciding-set
  formats.
- Test invalid scores and winner mismatches.
- Enter a result with a backdated played time and verify its ordering.
- Clear scheduled and previously unscheduled results and verify their restored
  states.
- Verify unauthorized requests fail.
- `npm run lint`
- `npm run build`

### MGO-012 - Record retirements and walkovers

**Goal:** Represent exceptional outcomes without corrupting standings.

**Scope:**

- Extend score entry to select retirement or walkover.
- Require an explicit winner.
- Allow partial played scores for retirement and no score for walkover.
- Display exceptional outcomes consistently in match lists.
- Ensure standings can identify these matches for differential exclusion.
- Clear stale normal-score fields when changing outcome type.
- Apply optimistic concurrency, audit logging, and route revalidation.

**Acceptance criteria:**

- Retirement and walkover results count as completed matches.
- A walkover cannot require fabricated set scores.
- A retirement may retain the score played before retirement.
- Both outcomes clearly identify the winner and outcome type.
- Normal-score validation does not incorrectly reject valid exceptional
  outcomes.

**Validate:**

- Record, edit, and display one retirement and one walkover.
- Change an exceptional result back to a normal result without stale fields.
- Verify unauthorized requests fail.
- `npm run lint`
- `npm run build`

## Phase 4 - Group standings

### MGO-013 - Implement the standings engine

**Goal:** Calculate trustworthy group tables from completed match records.

**Scope:**

- Implement a pure, testable standings calculator.
- Calculate played, wins, losses, sets for/against, and games for/against.
- Rank tied teams by head-to-head, then set difference, then game difference.
- For three or more tied teams, create a mini-table from matches among only the
  tied teams and rank it by mini-table wins, mini-table set difference, then
  mini-table game difference before applying overall differences.
- When a required head-to-head match or complete mini-table is not yet
  available, use overall set difference and game difference provisionally and
  return a provisional marker.
- Count retirement and walkover match wins while excluding those matches
  entirely from set and game totals.
- Return an explicit unresolved-tie group when every automatic rule is equal so
  finalization can request a manual order and note.
- Configure the focused test runner here if MGO-011 did not already require it.

**Acceptance criteria:**

- Every rule in `SPEC.md` has a focused automated test.
- Two-team and multi-team ties resolve as specified.
- Match tiebreak points are not counted as ordinary games in game difference.
- Exceptional outcomes affect W/L but not set/game totals.
- An unresolved tie is returned for organizer resolution rather than silently
  decided by an arbitrary team name or database order.
- Incomplete head-to-head data produces a clearly provisional order rather than
  being treated as a final tiebreak result.

**Validate:**

- Run the focused standings test suite.
- Run `npm run lint`.
- Run `npm run build`.

### MGO-014 - Build the groups standings page

**Goal:** Present live Group A and Group B standings clearly on phones.

**Scope:**

- Render both groups from the standings engine.
- Show rank, team, P, W, L, set difference, and game difference.
- Visually mark the top-four advancing zone.
- Explain tiebreak order and flag any unresolved tie.
- Show whether standings are provisional, live with complete tiebreak data, or
  finalized.

**Acceptance criteria:**

- Tables match the underlying completed matches.
- Group A and Group B are easy to compare without horizontal page overflow.
- Advancing and eliminated positions are distinguishable without relying only
  on color.
- Empty and partially played groups remain understandable.

**Validate:**

- Compare rendered standings with known test fixtures.
- Review with no results, partial results, and all results.
- Review at 320px and desktop widths.
- `npm run lint`
- `npm run build`

### MGO-015 - Finalize and reopen group standings

**Goal:** Create a deliberate boundary between live group play and the
knockout stage.

**Scope:**

- Add PIN-gated Finalize groups and Reopen groups actions.
- Prevent finalization until every group match has a completed result.
- For an unresolved exact tie, require the organizer to submit the tied teams
  in final order with an explanatory note as part of finalization.
- Snapshot final ranks when finalizing.
- Reject group-score edits while finalized.
- Clear final ranks, finalization time, and any manual tie note when reopening
  so corrected scores can be entered and the groups finalized again.
- If quarterfinal teams are assigned, allow reopening only while every
  quarterfinal remains unscheduled and incomplete; clear all quarterfinal team
  assignments atomically during reopening.
- Audit finalization, manual tie resolution, and reopening.
- Implement finalization and reopening as transactional database functions/RPCs
  introduced through a user-reviewed migration tested locally and applied to
  staging before preview validation.

**Acceptance criteria:**

- Only an authorized organizer can finalize or reopen groups.
- Finalization is atomic: status, all final ranks, any manual tie note, and its
  audit record succeed or fail together.
- Locked group scores cannot be changed through either the UI or direct action
  calls.
- Reopening restores editing and clearly marks standings as live.
- Re-finalizing recomputes ranks from current results.
- Reopening fails without changing data after any quarterfinal has been
  scheduled or completed.

**Validate:**

- Attempt early finalization with incomplete matches.
- Finalize an exact tie using a manual order and required note.
- Finalize a complete fixture set and attempt a score edit.
- Assign unscheduled quarterfinal teams, reopen, and confirm those assignments
  are cleared.
- Attempt reopening after scheduling a quarterfinal and confirm it is rejected.
- Reopen, correct a score, and finalize again.
- Verify unauthorized requests fail.
- `npm run lint`
- `npm run build`

## Phase 5 - Home and group-stage launch

### MGO-016 - Build the tournament home page

**Goal:** Give participants the most useful tournament information in one
quick view.

**Scope:**

- Replace the placeholder with tournament title, dates, and concise context.
- Show the next scheduled matches.
- Show current Group A and Group B leaders.
- Link directly to full matches and standings, and to the bracket once that
  later release is available.
- Handle no scheduled matches and no completed results.

**Acceptance criteria:**

- Upcoming matches use the same ordering and Central Time formatting as the
  Matches page.
- Leaders come from the same standings engine as the Groups page.
- The primary information is visible without excessive scrolling on a phone.
- The page never presents stale hard-coded tournament data.

**Validate:**

- Test with empty, partial, and active tournament data.
- Review at phone and desktop widths.
- `npm run lint`
- `npm run build`

### MGO-017 - Harden the group-stage release

**Goal:** Make the group-stage workflows dependable during real court-side use
before the tournament begins.

**Implementation note:** Hardening this slice exposed three defects that were
fixed here. The unlock route built its redirect from the internal request URL,
so the organizer cookie could be set on one hostname and read on another;
redirects now use the validated request host, and the cookie is Secure for every
real deployment while a loopback HTTP origin (local and end-to-end runs) opts
out. The Content Security Policy also needed two adjustments found in browser
testing: `upgrade-insecure-requests` is sent only on HTTPS, and `connect-src` is
left to the `default-src` fallback because WebKit blocks Next.js RSC and
server-action fetches when both are declared. The smoke suite runs organizer
write flows on the Chromium projects; Playwright's WebKit instrumentation
intermittently drops streamed server-action responses, so iOS Safari covers the
public pages, the 320px layout, unlock, and an automated network-failure retry
that preserves form input. The complete WebKit write flows were also verified
manually.

Accepted trade-off: organizer forms now dispatch their server action through a
client wrapper so a dropped mobile connection becomes a retryable message with
every entered value preserved. React cannot serialize a native POST target for
a wrapped action, so a submit sent before hydration is replayed once the bundle
loads instead of posting directly. Preserving entered values on a failed
request was judged more valuable than that pre-hydration path.

**Scope:**

- Review Home, Groups, Matches, unlock, scheduling, and scoring at narrow mobile
  widths.
- Add consistent loading, empty, success, and error states.
- Confirm keyboard access, visible focus, labels, error association, contrast,
  and reduced-motion behavior.
- Prevent layout shifts, stale-write overwrites, and accidental double
  submissions.
- Add confirmations for destructive or locking actions.
- Confirm every successful mutation revalidates all affected public views.
- Add a focused Playwright smoke suite for the critical public, unlock,
  scheduling, scoring, and standings flows using non-production data.
- Run browser automation against an isolated local test database in CI, not the
  shared staging project.
- Add and verify baseline security headers without breaking Next.js assets,
  forms, or Vercel deployment behavior.
- Exercise current iOS Safari and Android Chrome behavior, including mobile
  network failures and retries that preserve form input.

**Acceptance criteria:**

- No group-stage workflow requires a mouse or desktop viewport.
- No group-stage page has unintended horizontal overflow at 320px.
- Forms retain user input when server validation fails.
- Mutations clearly show pending, success, conflict, and failure states.
- Critical state-changing actions require deliberate confirmation.
- Public pages show successful edits without waiting for an unrelated cache
  expiry.

**Validate:**

- Complete every public and group-stage organizer workflow on a phone-sized
  viewport.
- Complete a keyboard-only pass.
- Exercise stale-write conflicts and double-submission protection.
- Run the existing lint, test, and build commands.
- Run the Playwright group-stage smoke suite.

### MGO-018 - Launch the group-stage site

**Goal:** Release the useful group-stage site without waiting for deferred
knockout features.

**Implementation note:** Launch CI reproduced Next.js issue #96233, where a
successful server-action response can leave React permanently pending under
load. The shared resilient-action hook temporarily nudges pending transitions
until the upstream scheduler race is fixed.

**Scope:**

- Add favicon, page titles, descriptions, social/OG metadata, and share image.
- Keep local Docker, cloud staging, and production Supabase configuration
  isolated; never test mutations against production casually.
- Verify production environment variables, cookie secrets, PIN configuration,
  server-only credentials, Row Level Security, and rate limiting.
- Add a minimal operational note for changing the PIN, applying migrations,
  reviewing audit history, exporting a backup, and recovering from a failed
  deployment.
- Apply production migrations as an explicit backed-up release step; never run
  them automatically from the Vercel build.
- Seed production exactly once and take an initial data export/snapshot.
- Deploy Home, Groups, Matches, and organizer group-stage workflows to Vercel.
- Hide the Bracket navigation item or label it clearly as coming soon until the
  knockout release is deployed.

**Acceptance criteria:**

- Shared links show McGraw Open branding.
- Production contains the intended teams and fixtures exactly once.
- Public users can read but cannot mutate data directly or read audit history.
- Authorized scheduling, scoring, exceptional outcomes, and standings
  finalization operate on the production URL.
- Recovery and routine update steps are documented without exposing secrets.
- The missing knockout UI does not block or break group-stage use.

**Validate:**

- Run the complete existing test suite.
- `npm run lint`
- `npm run build`
- Perform a production smoke test of every group-stage public route and mutation
  type.
- Confirm the initial production backup/export can be read.

**External input:** Production Vercel and Supabase access may require the user.

## Phase 6 - Knockout stage

### MGO-019 - Render the knockout bracket

**Goal:** Show the seven-match knockout structure before and after teams are
assigned.

**Scope:**

- Render four quarterfinals, two semifinals, and the final.
- Show seed placeholders such as A1 and B4 until teams are assigned.
- Reuse match status, schedule, venue, score, and outcome presentation.
- Use explicit source-match relationships or typed mapping rather than parsing
  display labels.
- Provide a readable mobile layout rather than forcing a desktop bracket to
  shrink.

**Acceptance criteria:**

- All seven seeded knockout rows render in the correct relationships.
- Assigned teams replace placeholders without losing seed context.
- Completed knockout scores use the same formatting as the Matches page.
- The bracket is understandable at 320px without horizontal page scrolling.

**Validate:**

- Review empty, partially assigned, scheduled, and completed brackets.
- Review phone and desktop layouts.
- `npm run lint`
- `npm run build`

**Timing:** Begin when the group stage is close to completion.

### MGO-020 - Assign finalized teams to quarterfinals

**Goal:** Safely convert locked group ranks into the fixed quarterfinal
matchups.

**Scope:**

- Add a PIN-gated action to assign A1/B4, A2/B3, A3/B2, and A4/B1.
- Require finalized standings.
- Show a confirmation preview before writing assignments.
- Make repeated execution idempotent.
- Prevent accidental overwrites once quarterfinal activity has started.
- Audit the assignment transaction and revalidate bracket/match views.
- Implement the four-match assignment as a transactional database function/RPC
  introduced through a user-reviewed migration tested locally and applied to
  staging before preview validation.

**Acceptance criteria:**

- Each quarterfinal receives exactly the teams dictated by `SPEC.md`.
- Live/unfinalized standings cannot populate the bracket.
- Running the action twice does not duplicate or swap teams.
- Existing quarterfinal schedules or results cannot be silently replaced.
- Reopening groups clears these assignments only while all quarterfinals remain
  unscheduled and incomplete.

**Validate:**

- Populate all four quarterfinals from a finalized test table.
- Retry the action and confirm no changes.
- Attempt population before finalization and after a quarterfinal result.
- Verify unauthorized requests fail.
- `npm run lint`
- `npm run build`

**Timing:** Deferred until the group stage is finalized.

### MGO-021 - Administer semifinal and final assignments

**Goal:** Support manual knockout progression as required for year one without
allowing upstream corrections to corrupt later rounds.

**Scope:**

- Add PIN-gated team assignment for SF1, SF2, and Final.
- Present eligible completed-match winners as the default choices.
- Require explicit organizer confirmation rather than automatic progression.
- Prevent the same team occupying both sides of one match.
- Lock an upstream knockout result after its winner is assigned downstream.
- Allow an organizer to clear an unscheduled, incomplete downstream assignment;
  only then may the upstream result be corrected.
- Protect scheduled or completed downstream matches from reassignment.
- Audit assignments and clears, and revalidate affected routes.

**Acceptance criteria:**

- Organizers can assign quarterfinal winners to semifinals and semifinal
  winners to the final.
- The UI makes the expected source match clear.
- Invalid, duplicate, or premature assignments are rejected.
- Assigned upstream results cannot be edited.
- Clearing an eligible downstream assignment unlocks its upstream result.
- Scheduled or completed downstream matches cannot be cleared through the
  normal correction flow.
- Knockout scheduling and scoring continue to use the existing match forms.

**Validate:**

- Complete test quarterfinals, assign semifinals, complete them, and assign the
  final.
- Attempt to edit a locked upstream result.
- Clear an eligible downstream assignment and correct the upstream result.
- Exercise invalid, repeated, scheduled, and completed downstream cases.
- Verify unauthorized requests fail.
- `npm run lint`
- `npm run build`

**Timing:** Deferred until knockout play begins.

## Phase 7 - Knockout quality and release

### MGO-022 - Harden and release the knockout stage

**Goal:** Add the knockout workflows to production without regressing the live
group-stage site.

**Scope:**

- Complete a mobile, keyboard, loading, empty, error, and conflict-state pass
  for Bracket and all knockout organizer flows.
- Test bracket assignment transactions, upstream locks, downstream clears,
  audit records, and route revalidation.
- Extend the Playwright suite with quarterfinal assignment, downstream clear,
  upstream lock, and bracket display coverage.
- Apply any required production migration using the documented migration and
  backup process.
- Deploy the knockout release to Vercel.

**Acceptance criteria:**

- The bracket and organizer controls are usable at 320px and by keyboard.
- Existing group-stage pages and mutations still work.
- Public users cannot perform assignments or read audit history.
- Production bracket state matches the finalized group ranks and recorded
  knockout results.
- No stale assignment or result can silently overwrite newer data.

**Validate:**

- Run the complete existing test suite.
- `npm run lint`
- `npm run build`
- Perform a production smoke test of every bracket route and knockout mutation.
- Repeat a focused smoke test of group-stage reads and writes.

## Phase 8 - Tournament roster maintenance

### MGO-023 - Expand Group A roster and fixtures

**Goal:** Release Fault Tolerant as Group A's sixth team with its complete
round-robin fixtures without altering existing tournament activity or knockout
rules.

**Scope:**

- Add `Fault Tolerant - Shankar / Mohan` to Group A through a new versioned
  Supabase migration with a stable team ID. Do not rewrite the original schema
  or seed migrations to correct production data.
- Replace the existing Group A final-rank constraint with one that permits
  ranks 1-6 while continuing to reject invalid ranks.
- Insert five deterministic, stable `GA-11` through `GA-15` group fixtures
  pairing the new team once with every existing Group A team. Add them as
  unscheduled without changing the original ten Group A fixtures.
- Make the controlled data change transactional and fail without changing data
  unless the groups remain open, all group fixtures remain unscheduled, and
  knockout assignments remain blank. Preserve all existing teams, fixtures,
  schedule/result data, and audit history.
- Keep public reads and organizer scheduling and scoring on the existing
  server-only data paths. Rely on the existing row-level triggers to audit the
  inserted team and fixtures, and preserve anonymous write denial.
- Update hard-coded public copy and automated expectations from 11 teams, 25
  group matches, and 32 total matches to 12 teams, 30 group matches, and 37
  total matches.
- Verify Home, Groups, Matches, and Bracket consume the expanded data without
  special-case client logic. Group A must show six standings rows and 15
  fixtures while the top-four advancement treatment and quarterfinal mapping
  remain unchanged.
- Follow the locked system in `DESIGN.md`; preserve semantic standings,
  existing match summaries, mobile behavior, keyboard access, and page-level
  overflow safeguards without introducing a new visual pattern.
- Update directly related operational documentation and production count
  checks.
- Apply the reviewed migration to staging, then use the documented backup,
  dry-run, migration, deployment, and smoke-test process to release it to
  production before tournament activity begins.
- Do not add roster-management UI, player registration, team editing or
  deletion, schedule regeneration, new authentication behavior, a new
  dependency, or changes to standings rules, advancement, knockout structure,
  or the design system.

**Acceptance criteria:**

- Exactly 12 teams exist: six in Group A and six in Group B.
- Exactly 30 group matches exist: 15 in Group A and 15 in Group B. The seven
  knockout matches remain unchanged, for 37 matches total.
- Every team has exactly five group fixtures; no team plays itself and no
  unordered group pairing is duplicated.
- `Fault Tolerant - Shankar / Mohan` has one unscheduled fixture against each
  original Group A team, with stable codes `GA-11` through `GA-15`.
- The original ten Group A fixtures and all Group B and knockout records retain
  their IDs and data unchanged.
- Group A final rank 6 is accepted, rank 7 is rejected, and finalization still
  requires every group result before atomically storing complete ranks.
- The migration aborts atomically when the tournament is not in the approved
  open, all-unscheduled, unassigned-knockout state.
- Public Home, Groups, Matches, and Bracket pages render the expanded
  tournament data. Filtering Matches to Group A returns 15 fixtures, and the
  top four remain the only advancing positions.
- Existing PIN-authorized scheduling and result flows accept the five new
  match codes. Unauthorized writes remain denied and the new rows have
  server-only audit records.
- The six-row standings table and expanded fixture list remain usable at 320px
  and desktop widths, at 200% zoom, and with keyboard navigation, without
  page-level horizontal overflow.
- Staging and production contain the reviewed counts and data, and the
  production deployment serves the updated tournament copy and fixtures.

**Validate:**

- Show the complete migration and explain its effect before applying it.
- Run a clean local Supabase reset and focused pgTAP tests for counts, stable
  identities, pairings, final-rank constraints, migration preconditions, RLS,
  and audit records.
- Run the relevant standings, finalization, match-presentation, page, and
  organizer-flow automated tests.
- Run `npm run test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run focused Playwright coverage for public counts and Group A filtering, plus
  the existing organizer scheduling and result flows against a new fixture.
- Review Groups and Matches at 320px and desktop widths, at 200% zoom, and by
  keyboard.
- Apply and verify the migration on staging without using production data for
  automated tests.
- Export readable production schema and data backups, review the linked
  migration list, perform a dry run, apply the migration, deploy Vercel, and
  smoke-test the production counts and public routes.

**External input:** Supabase and Vercel access plus explicit approval of the
complete migration are required for staging and production release.

**Timing:** Complete before the organizer PIN is distributed or any tournament
match is scheduled or completed.

## Phase 9 - Night Match interface overhaul

Phase 9 rebuilds the entire interface on `DESIGN.md` v2.0 (Night Match) from
the approved mockups. It changes presentation only. No slice in this phase may
add, remove, or alter tournament behavior, database schema, seed data,
migrations, server actions, authorization, validation, concurrency rules, or
audit behavior.

The phase releases as a single production cutover. Slices land on `main` and
are validated through Vercel preview deployments. Production is updated only by
MGO-030.

Every slice in this phase inherits the `DESIGN.md` accessibility floor: WCAG AA
contrast, 12px minimum real text, 44px minimum interactive targets, visible
volt focus on every focusable element, no page-level horizontal overflow at
320px or 200% zoom, no information conveyed by color alone, and a static,
legible resting state under `prefers-reduced-motion: reduce`.

### MGO-024 - Rebuild the design foundation and app shell

**Goal:** Replace the v1.0 light design foundation with the Night Match token
system, typefaces, primitives, and navigation shell while every existing route
keeps working.

**Implementation note:** `DESIGN.md` originally placed the organizer control in
the header only at 900px and above. Because the phone bottom bar is reserved
for the four public routes and there is no hamburger menu, that would have
stranded the unlock entry point on phones. The control now renders at every
width — icon-only below 900px, labelled above it — and appears only while
organizer mode is locked, since the banner owns the lock control once unlocked.
`DESIGN.md` was updated in the same session to record this.

**Scope:**

- Read `DESIGN.md` v2.0 completely and treat it as the locked system.
- Replace the design tokens in `app/globals.css` with the Night Match brand
  accents, ink neutrals, semantic colors, and aliases as CSS custom properties,
  exposed through Tailwind `@theme inline`. Add the spacing, radius, shadow,
  glow, duration, and typography scale tokens. Remove the v1.0 Blue Court
  tokens once nothing references them.
- Replace Barlow and Barlow Condensed with Anton, Inter, and Roboto Mono loaded
  through `next/font/google` in `app/layout.tsx`. Set tabular figures on the
  mono face.
- Set base document styling: `--bg-page` canvas, body type, display heading
  treatment, uppercase display via CSS rather than capitalized content, link
  styling, selection color, and a global visible focus ring.
- Add a single reduced-motion block that neutralizes the four permitted
  animations.
- Build the shared primitives named in `DESIGN.md`: Button, Badge, Chip, Card,
  GroupShield including the Group B hatch pattern, Eyebrow, Stat, PulseDot, and
  the Input and Select control styling.
- Add the reusable court-line SVG device and the court-glow background
  treatment as `aria-hidden` presentation components.
- Rebuild the app shell: sticky blurred header with the McGRAW OPEN wordmark,
  desktop primary navigation with an outlined Organizer control at 900px and
  above, and a fixed phone bottom tab bar for Home, Groups, Matches, and
  Bracket. Reserve page bottom padding equal to the bar height. Do not
  implement a hamburger menu.
- Rebuild the organizer access strip as the `OrganizerBanner` described in
  `DESIGN.md`, preserving the existing unlock and lock behavior and server-side
  cookie validation exactly.
- Retheme the remaining page-level styles onto the new tokens so Home, Groups,
  Matches, Bracket, and every organizer route stay legible, usable, and free of
  contrast failures on the dark base before later slices rebuild them. A route
  may look transitional, but it may not look broken or become unreadable.
- Convert the loading skeletons, `error.tsx`, `global-error.tsx`,
  `not-found.tsx`, `app/icon.svg`, and `app/opengraph-image.tsx` to the Night
  Match surfaces and wordmark.
- Update automated tests that assert removed class names, token names, or shell
  markup.
- Do not change page content, data flow, routes, server actions, or component
  APIs beyond what the shell itself requires. Do not add a component library,
  an icon CDN, a CSS framework, or a new runtime dependency.

**Acceptance criteria:**

- Every existing route renders on the Night Match canvas with no unstyled,
  invisible, or contrast-failing text, and no route regresses in function.
- Design tokens exist only as CSS custom properties surfaced through Tailwind.
  No component contains a raw hex value.
- Anton, Inter, and Roboto Mono load through `next/font` with no runtime font
  CDN request, and no v1.0 font remains referenced.
- The header wordmark renders McGRAW in white and OPEN in volt and links home
  with an accessible name.
- All four primary routes are reachable from the phone bottom tab bar and the
  desktop header, each target is at least 44px, and the active route is marked
  with `aria-current="page"` plus a non-color marker.
- Page content is never obscured by the fixed bottom bar at any width.
- The organizer banner appears only with a valid organizer cookie, and unlock
  and lock still validate on the server.
- Every focusable element shows a visible volt focus ring.
- No page scrolls horizontally at 320px or at 200% zoom.
- `prefers-reduced-motion: reduce` leaves every screen static and fully
  legible.

**Validate:**

- Run the existing Vitest suite and update assertions tied to the old shell.
- Run `npm run test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run the existing Playwright suite and update selectors broken by the shell
  change.
- Review every route at 320px, 390px, tablet, and desktop widths, and at 200%
  zoom.
- Navigate the shell by keyboard only.
- Verify the reduced-motion resting state in the browser.
- Confirm no server-only value or secret entered the browser bundle.

### MGO-025 - Rebuild the matches list and shared match presentation

**Goal:** Rebuild the Matches route and the shared match presentation used
across the site to the approved mockup, without changing filtering, ordering,
or result semantics.

**Implementation note:** The filter bar's group and stage legends are
`aria-label` attributes rather than hidden `.sr-only` spans. Inside the sticky,
horizontally scrolling bar an absolutely positioned `.sr-only` element resolves
its containing block against the sticky ancestor rather than the scroller, so
it escaped the scroll clip and widened the page past 320px. The slice also
repaired three rules left pointing at deleted v1.0 tokens (`.content-panel` /
`.organizer-panel`, `.skeleton-match`, and `.skeleton-filters`), which had been
rendering those surfaces borderless and transparent since MGO-024.

**Scope:**

- Read `DESIGN.md` v2.0, in particular the Matches specification, the team name
  treatment, and the status vocabulary.
- Add a pure presentation helper that splits a stored team name on the first
  `" - "` into a nickname and a player pair, returning the whole string as the
  nickname when no separator exists. Cover it with focused unit tests. Do not
  change stored data, queries, or the database.
- Rebuild the match card: context line with group and match code, status badge,
  both teams using the nickname and player treatment with a display VS divider
  on desktop and a stacked layout on phone, a meta row with Central Time and
  venue, and a hairline-separated organizer action row.
- Rebuild the completed-match presentation as a semantic two-row score table
  with mono figures, the winner marked in white with a Winner badge and the
  loser dimmed. Keep match tiebreak columns visually and textually distinct
  from full-set columns, and state retirement and walkover outcomes in words.
- Rebuild the filter bar as sticky blurred chips for group and stage with a
  hairline divider and a live result count, horizontally scrollable within
  itself on phone while the page does not overflow.
- Rebuild the Scheduled, Unscheduled, and Completed section headers with
  eyebrows and counts.
- Rebuild the zero-result state to name the active filters and offer to clear
  them.
- Preserve the existing URL-shareable filter state, section ordering, scheduled
  and completed sort order, `played_at`-based completed ordering, knockout
  placeholder labels, and every existing data-integrity error path.
- Do not change filter semantics, query logic, server actions, or routes.

**Acceptance criteria:**

- Every match state renders unambiguously: unscheduled, scheduled, completed,
  match tiebreak, retirement, and walkover.
- A team name stored as `"Nickname - Player One / Player Two"` renders the
  nickname as the primary label and the players as secondary text, and a name
  without a separator renders as a single primary label with no empty line.
- Filters still isolate Group A, Group B, quarterfinals, semifinals, and the
  final, and reloading or sharing a filtered URL preserves the view.
- The result count reflects the filtered set from live data.
- The filter bar stays visible while scrolling on phone and desktop, and its
  chips are keyboard operable with visible focus.
- Section order and sort order match `SPEC.md` exactly.
- The zero-result state names the active filters and clears them in one action.
- Score figures align in columns, and a match tiebreak is distinguishable
  without relying on color.
- Match cards remain usable at 320px with no page-level horizontal overflow.

**Validate:**

- Add focused unit tests for the team name split, including a name with no
  separator and a name containing more than one separator.
- Run the existing match presentation, filter, and page tests.
- Run `npm run test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run the Playwright public pages suite and update selectors as needed.
- Inspect a representative fixture in each of the six match states.
- Review Matches at 320px, 390px, tablet, and desktop widths, and at 200% zoom.
- Operate the filter bar by keyboard only.

### MGO-026 - Rebuild the group standings page

**Goal:** Rebuild the Groups route to the approved mockup, including the
advancing rail, cut-line tie treatment, and organizer finalization panel, using
only data the standings engine already computes.

**Scope:**

- Read `DESIGN.md` v2.0, in particular the Groups specification.
- Rebuild the page intro with the round-robin eyebrow, display title, and a
  "Live standings" marker driven by the existing `provisional` flag, with a
  sentence explaining provisional ordering.
- Rebuild both standings tables as semantic tables with captions and header
  cells: rank, team, played, won, lost, set difference, and game difference on
  desktop, reduced to rank, team, won, and set difference on phone.
- Add the per-group header with the group shield, group name, an
  "N of 15 complete" count derived from live data, and a state badge that shows
  "Cut-line tie" in warning when the existing `unresolvedTies` output touches
  the top four positions.
- Add the advancing rail as an inset left rail on the top four rows, volt for
  Group A, court blue for Group B, and warning for a row inside a cut-line tie,
  with a faint volt wash on rank one. Pair every rail with an "Advancing" or
  "Cut-line tie" text label so no meaning is color-only. Separate rank four
  from rank five with a dashed divider.
- Render figures in mono with team names in Inter, and keep the team nickname
  and player treatment from MGO-025.
- Present the finalized state with a "Locked" badge, the stored final ranks,
  and any manual tie note, replacing the live marker.
- On phone, switch between Group A and Group B with chips while keeping both
  tables in the accessible DOM.
- Rebuild the organizer finalization panel below the tables, and the reopen
  affordance when groups are finalized, preserving every existing lock,
  precondition, and blocked-state explanation.
- If a table must scroll at a narrow width, scroll it inside its own focusable,
  labelled container without letting the page overflow.
- Do not change standings calculation, tiebreak rules, finalization behavior,
  server actions, or authorization.

**Acceptance criteria:**

- Both groups render six rows each with correct ranks, records, and
  differentials from the existing standings engine.
- The top four rows in each group are marked as advancing by both a rail and a
  text label, and rank five is separated by a visible divider.
- Provisional standings show the "Live standings" marker and its explanation;
  finalized standings show the "Locked" badge, stored ranks, and any manual tie
  note.
- An unresolved tie affecting the top four shows the cut-line treatment with
  warning color, a text label, and an icon.
- Removing color from the page still communicates who is advancing and which
  rows are tied.
- The phone group switch reaches both tables, and both remain available to
  assistive technology.
- The finalization and reopen controls appear only for an unlocked organizer,
  still validate on the server, and still explain why they are blocked.
- Tables use real `table`, `th`, and `caption` markup and remain readable at
  320px and at 200% zoom without page-level horizontal overflow.

**Validate:**

- Run the existing standings, standings presentation, and groups page tests.
- Exercise a provisional group, a group with a top-four tie, and a finalized
  group.
- Run `npm run test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run the Playwright group transition suite and update selectors as needed.
- Review Groups at 320px, 390px, tablet, and desktop widths, and at 200% zoom.
- Navigate the group switch and any scroll container by keyboard only.
- Verify the page in grayscale to confirm no state is color-only.

### MGO-027 - Rebuild the home page and cinematic hero

**Goal:** Rebuild Home as the approved cinematic landing moment with the locked
headline copy, live next-match card, real-data stat strip, group leaders, and
bracket teaser.

**Scope:**

- Read `DESIGN.md` v2.0, in particular the Home specification and the locked
  hero copy.
- Build the hero on `--ink-950` with the `aria-hidden` court-line SVG and the
  court-blue radial glow, a tournament-window pill eyebrow, the locked headline
  "Nine to five. Then they serve." with the final word in volt, the locked
  subhead, and the "View the bracket" and "Full schedule" actions.
- Build the "Next on court" card with a pulse dot, eyebrow, schedule badge,
  stage and venue line, and both teams with a display VS divider. Float it over
  the hero at desktop widths and place it below the hero on phone. Give it a
  specific empty state that points at the fixture list when nothing is
  scheduled.
- Build the stat strip as four hairline-divided cells with Anton numerals over
  uppercase labels, arranged 2x2 on phone. Derive teams, groups, and match
  counts from live tournament data; never hard-code a count. The mockup's "31
  matches" is superseded by the live total.
- Rebuild the group leader cards with the group shield, leading or joint
  leading teams, wins and played, and the existing empty state before any
  result exists.
- Build the bracket teaser as a small self-drawing connector graphic linking to
  Bracket, rendering drawn and static under reduced motion.
- Preserve the existing upcoming-match selection, leader derivation, page
  metadata, and Open Graph behavior.
- Do not add tournament data, counters, or queries that do not already exist,
  and do not introduce a third animation beyond the pulse dot and the teaser.

**Acceptance criteria:**

- The hero renders the locked headline and subhead exactly as written in
  `DESIGN.md`, with the final headline word in volt.
- The court-line device and glow are decorative, marked `aria-hidden`, and
  never reduce the contrast of hero text below AA.
- The "Next on court" card shows the soonest scheduled match in Central Time
  and switches to its empty state when no match is scheduled.
- Stat strip values match live tournament data and update without a code change
  when fixtures change.
- Group leader cards show joint leaders correctly and show the pre-result empty
  state when a group has no completed match.
- The bracket teaser links to Bracket and renders complete and static under
  reduced motion.
- Home is usable at 320px with no page-level horizontal overflow, and the hero
  headline never clips or overlaps the next-match card at any width.
- All hero and card actions are keyboard reachable with visible focus.

**Validate:**

- Update and run the existing home page and home presentation tests, including
  the changed hero copy.
- Run `npm run test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run the Playwright public pages suite and update selectors as needed.
- Check Home with a scheduled match, with no scheduled match, with no completed
  results, and with joint leaders.
- Review Home at 320px, 390px, tablet, and desktop widths, and at 200% zoom.
- Verify the reduced-motion resting state of the pulse dot and bracket teaser.

**Implementation note:** Home now leads with a bespoke cinematic hero
(`home-hero`) and a single `NextOnCourt` card (the soonest scheduled match,
reusing the MGO-025 team treatment) rather than the previous two-match
"Upcoming matches" list; the removed home "View all matches" link meant the CSP
public-pages check now navigates via the hero "Full schedule" action. Stat and
teaser use new `components/home/` pieces; the pulse dot and teaser draw-in are
the only home animations and both rest fully drawn/static under reduced motion.

### MGO-028 - Rebuild the knockout bracket signature

**Goal:** Rebuild Bracket as the site's signature moment with self-drawing
connectors and a responsive draw, while keeping every result and placeholder as
accessible DOM content.

**Scope:**

- Read `DESIGN.md` v2.0, in particular the Bracket specification and the motion
  budget.
- Build the desktop layout at 900px and above as a four-column board —
  Quarterfinals, Semifinals, Final, Champion — with round eyebrows and an
  absolutely positioned `aria-hidden` SVG connector layer behind the cards.
- Draw base connectors in `--border-subtle`. Draw the champion's path as a
  volt stroke that animates in over roughly 2.4s ease-out, followed by a volt
  ball travelling that path exactly once. Derive the highlighted path from
  actual recorded results, and highlight nothing when no knockout result
  exists.
- Build the phone layout as the same rounds stacked QF to SF to Final with the
  connector geometry redrawn for the vertical arrangement and full-width cards.
- Render each knockout card with its code and source label, both teams using
  the MGO-025 team treatment, and set scores when completed. Mark the advancing
  team in volt and dim the eliminated team, always with a text cue as well.
- Render unassigned slots with their placeholder label such as "Winner QF3" or
  "A1" in dim text; never render an empty row.
- Give the Final card the single elevated treatment: volt-tinted gradient, volt
  border, `--glow-volt`, and a Championship eyebrow.
- Build the Champion cell as a dashed volt-bordered panel with a trophy icon
  reading "Awaits the final" until the final completes, then naming the winner.
- Under `prefers-reduced-motion: reduce`, render the final drawn state
  immediately with no ball and no transition.
- Keep the existing organizer entry points to quarterfinal and knockout
  assignment reachable from the board without changing their behavior.
- Do not convert the bracket to canvas, do not add a graph or animation
  library, and do not change bracket data, assignment logic, or locks.

**Acceptance criteria:**

- All seven knockout matches render with codes, source labels, teams or
  placeholders, and scores where recorded.
- The board is complete and readable before any animation runs, and no result
  is conveyed only by a drawn line or by color.
- The champion path highlights only positions supported by recorded results and
  highlights nothing before the first knockout result.
- The desktop board renders as four columns at 900px and above, and the phone
  board stacks QF to SF to Final, with no page-level horizontal overflow at
  320px.
- The Final card is the only elevated card on the page.
- The Champion cell reads "Awaits the final" until the final is complete, then
  names the winner.
- `prefers-reduced-motion: reduce` renders the drawn state instantly with no
  ball and no motion.
- Organizer assignment entry points appear only for an unlocked organizer and
  still validate on the server.
- All cards and links are keyboard reachable with visible focus.

**Validate:**

- Run the existing bracket, knockout assignment, and bracket page tests.
- Run `npm run test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run the Playwright knockout progression and quarterfinal assignment suites
  and update selectors as needed.
- Check the bracket with no assignments, with partial assignments, with a
  completed quarterfinal, and with a completed final.
- Review Bracket at 320px, 390px, 900px, and desktop widths, and at 200% zoom.
- Verify the reduced-motion resting state and confirm the animation runs once
  and does not loop.

**Implementation note:** The connector layer is a client-measured, aria-hidden
SVG (`components/bracket/bracket-connectors.tsx`) that reads the rendered card
positions and redraws elbows for the desktop four-column board and a left-hand
rail on phone. Highlighting is derived by `computeChampionPath` in
`lib/bracket.ts`: a connector lights up in volt only when its source match is
completed with a winner, so the path shows nothing before the first knockout
result, and the travelling ball follows the single realized route toward the
trophy. Validated with `npm run test`, `npm run lint`, `npm run build`, and the
Playwright public-pages, knockout-progression, and quarterfinal-assignment
suites (desktop-chrome, android-chrome, ios-safari), plus manual review of the
empty, in-progress, completed-final, phone, and reduced-motion states.

### MGO-029 - Rebuild the organizer forms and transition pages

**Goal:** Rebuild every organizer input surface on the Night Match focused-task
shell without weakening validation, authorization, concurrency, or lock
behavior.

**Scope:**

- Read `DESIGN.md` v2.0, in particular the schedule, result, and supporting
  screen specifications.
- Build the shared focused-task shell: organizer banner, back link, match code
  eyebrow, display title, context subtitle, and a 640px desktop cap with full
  width on phone.
- Rebuild the schedule page with the read-only current-match card, the Central
  Time eyebrow and explanation, 48px date, time, and venue controls in the
  specified responsive arrangement, and a sticky bottom save bar on phone.
- Rebuild the result page with the responsive score grid: four columns of team,
  S1, S2, and MTB on desktop and three columns at 46px on phone, remaining
  usable at 320px. Give the MTB column its distinct dashed and warning
  treatment and enable it only for the match tiebreak deciding-set format.
- Rebuild the winner radios as labelled volt-ring controls, the outcome and
  deciding-set format selectors as chip groups, and the derived-outcome
  callout that restates the result in words and updates as entry changes.
- Position "Clear result" as a danger text button separated from the primary
  action, and keep its existing confirmation and consequences.
- Render locked results read-only with a "Locked" badge that names the action
  required to unlock them.
- Rebuild the organizer unlock page on the focused shell with a single PIN
  field and a rate-limit message that never reveals whether an attempt was
  close and never echoes the entered value.
- Rebuild the finalize, reopen, quarterfinal assignment, and knockout
  assignment pages on the same shell, showing what is about to be committed and
  the downstream effects, including that reopening clears final ranks and
  quarterfinal assignments.
- Rebuild field-level validation errors, the summarized error region, pending
  states that name what is happening, and the stale-write conflict message that
  offers to reload. Preserve the existing resilient form action behavior that
  keeps input after a failed request.
- Rebuild the organizer loading skeletons to match the new form layouts.
- Do not change server actions, Zod schemas, score validation, organizer cookie
  validation, origin checks, rate limiting, optimistic concurrency, tournament
  locks, audit writes, or route revalidation.

**Acceptance criteria:**

- Every organizer route renders on the focused shell and remains fully operable
  at 320px, including the score grid.
- Forms use real `form`, `label`, `fieldset`, and `legend` markup, and every
  control has a programmatically associated label.
- Validation errors appear next to the offending field and in a summary, and
  are announced to assistive technology.
- Submitting with an invalid, unauthorized, stale, or locked request produces
  the correct existing server behavior and a clear message; no client-side
  change can bypass a server check.
- Failed requests preserve entered input and offer a retry.
- The MTB column is available only for the match tiebreak format, and the
  derived-outcome callout matches the entered score and outcome.
- Locked results render read-only and name the action required to unlock them.
- The unlock page never echoes the PIN and never reveals attempt proximity, and
  the PIN does not reach browser storage, logs, or the audit record.
- Reopen and assignment pages state their downstream effects before the action
  is taken.
- Every control is at least 44px, keyboard operable, and shows visible focus,
  and the phone sticky save bar never covers a field.

**Validate:**

- Run the existing organizer action, route handler, form, session, rate limit,
  and result tests.
- Run `npm run test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run the Playwright unlock, schedule, result, resilience, group transition,
  quarterfinal assignment, and knockout progression suites, updating selectors
  as needed.
- Exercise a normal score, a match tiebreak, a retirement, a walkover, clearing
  a result, a locked result, a stale write, and an unauthorized write.
- Review every organizer route at 320px, 390px, tablet, and desktop widths, and
  at 200% zoom.
- Complete a full schedule and a full result entry using only the keyboard.
- Confirm no secret or server-only value entered the browser bundle.

**Implementation note:** Delivered on a shared `FocusedTaskShell`
(`components/organizer/focused-task-shell.tsx`) with the global
`OrganizerBanner` above it. The result score grid's third column is the single
deciding-set column: it renders as `S3` for the full-set format and switches to
the dashed, warning-toned `MTB` column only when the match-tiebreak format is
selected, keeping the existing `set3` fields and server validation unchanged.
The live derived-outcome callout is a client-only preview recomputed from an
`onChange` snapshot; the server action remains the source of truth. On the
schedule form the phone sticky save bar is the last flow element with the
"Remove schedule" action above it so the bar never covers a field. A summarized
error region (`components/forms/form-error-summary.tsx`) links each field error
inside the existing alert panel. No server action, Zod schema, score
validation, cookie/origin check, rate limit, concurrency, lock, audit, or
revalidation behavior was changed. Verified with `npm run test` (181 passed),
`npm run lint`, `npm run build`, and the full Playwright suite (88 passed, 2
intentionally skipped) against local Supabase.

### MGO-030 - Harden and release the interface overhaul

**Goal:** Verify the completed Night Match interface across accessibility,
responsiveness, and tournament state, then release it to production in a single
cutover without regressing live tournament data.

**Scope:**

- Complete a full pass over every route for keyboard operation, focus order,
  screen-reader labelling, heading structure, 200% zoom, 320px width, grayscale
  state legibility, and `prefers-reduced-motion` resting states.
- Verify every shipped text and background pair against the `DESIGN.md`
  contrast table, and confirm no real text renders below 12px and no
  interactive target below 44px.
- Confirm every route renders correctly in each tournament state: groups open,
  groups finalized, no scheduled matches, no completed results, a top-four tie,
  partial knockout assignment, and a completed final.
- Confirm public users still cannot mutate data or read audit history, and that
  organizer routes still enforce cookie validation, origin checks, rate
  limiting, concurrency, and locks.
- Reconcile the full Vitest and Playwright suites with the new interface, and
  extend Playwright coverage where the overhaul changed a critical selector or
  workflow entry point.
- Verify no v1.0 token, font, class, or component remains in the codebase, and
  that no unused CSS or dependency was left behind.
- Confirm no server-only value, secret, or service-role credential entered the
  browser bundle.
- Review the deployed preview build on a real phone and a real desktop browser
  before release.
- Release with the documented production process: confirm the commit on `main`
  with passing checks, verify production environment variables exist, take
  readable schema and data backups, deploy with `vercel --prod`, confirm the
  stable alias, and smoke-test every public route and organizer mutation.
- No database migration is expected. If one becomes necessary, stop and obtain
  explicit approval before applying it.
- Do not add features, change tournament rules, or alter the design system
  during this slice.

**Acceptance criteria:**

- Every route meets the `DESIGN.md` accessibility floor, verified rather than
  assumed.
- The complete Vitest and Playwright suites pass, and Playwright covers the
  critical public and organizer workflows on the new interface.
- No route overflows horizontally at 320px or at 200% zoom, and no state is
  conveyed by color alone.
- Every tournament state listed in scope renders correctly on every route.
- No v1.0 design token, font, or component remains referenced.
- Authorization, validation, concurrency, lock, audit, and revalidation
  behavior is unchanged from before the overhaul.
- Production serves the Night Match interface at `https://mcgrawopen.com`, the
  stable alias points at the released deployment, and production tournament
  data is unchanged by the release.
- A production smoke test passes for Home, Groups, Matches, Bracket, organizer
  unlock, scheduling, normal scores, retirement, walkover, clearing a result,
  finalization safeguards, quarterfinal assignment, semifinal and final
  assignment, upstream locks, and eligible downstream clears, with any fixture
  changed solely for the smoke test restored afterward.
- A verified rollback path exists using `vercel rollback`.

**Validate:**

- Run `npm run test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run test:e2e`.
- Audit contrast, text size, and target size against the `DESIGN.md` table.
- Complete a keyboard-only and screen-reader pass over every route.
- Review every route at 320px, 390px, tablet, and desktop widths, at 200% zoom,
  and in grayscale.
- Verify reduced-motion behavior on every animated surface.
- Validate the Vercel preview deployment on a real phone before release.
- Take readable production schema and data exports and confirm both are
  non-empty.
- Deploy with `npx vercel@latest --prod`, confirm the stable alias, and run the
  full production smoke test.
- Take a post-release export and confirm production counts are unchanged.

**External input:** Vercel and Supabase production access are required for the
release, along with an explicit decision to cut over.

**Timing:** Schedule the cutover outside an active match window so a scheduling
or result entry is not interrupted, and confirm no organizer is mid-entry
before deploying.
