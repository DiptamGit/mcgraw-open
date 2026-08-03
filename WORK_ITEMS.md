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
- Every UI or UX item from MGO-006 through MGO-022 must read and follow the
  locked system in `DESIGN.md`. Foundational deviations require explicit user
  approval and an update to `DESIGN.md` first.

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
| MGO-010 | Schedule and reschedule matches | Not started | MGO-008, MGO-009 |
| MGO-011 | Enter and edit normal scores | Not started | MGO-008, MGO-009 |
| MGO-012 | Record retirements and walkovers | Not started | MGO-011 |
| MGO-013 | Implement the standings engine | Not started | MGO-005, MGO-012 |
| MGO-014 | Build the groups standings page | Not started | MGO-006, MGO-013 |
| MGO-015 | Finalize and reopen group standings | Not started | MGO-009, MGO-014 |
| MGO-016 | Build the tournament home page | Not started | MGO-007, MGO-014 |
| MGO-017 | Harden the group-stage release | Not started | MGO-010, MGO-012, MGO-015, MGO-016 |
| MGO-018 | Launch the group-stage site | Not started | MGO-002, MGO-017 |
| MGO-019 | Render the knockout bracket | Not started | MGO-005, MGO-006, MGO-018 |
| MGO-020 | Assign finalized teams to quarterfinals | Not started | MGO-015, MGO-019 |
| MGO-021 | Administer semifinal and final assignments | Not started | MGO-011, MGO-019, MGO-020 |
| MGO-022 | Harden and release the knockout stage | Not started | MGO-018, MGO-021 |

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
