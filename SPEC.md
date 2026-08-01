# McGraw Open 2026 — Tournament Site Spec

## Overview
Web app replacing the Excel tracker for the McGraw Open, an annual local doubles
tennis tournament (5th year). Public read access for all participants; writes
gated behind a single shared PIN (no user accounts in year one).

- Dates: Aug 1 – ~Sep 30, 2026 (matches scheduled ad hoc over the window)
- Tournament timezone: America/Chicago (Central Time)
- 11 doubles teams in two groups (A: 5 teams, B: 6 teams)
- Group stage: full round robin within each group (A: 10 matches, B: 15 matches)
- Top 4 per group advance to knockout
- Quarterfinals (fixed): A1vB4, A2vB3, A3vB2, A4vB1 → Semifinals → Final

## Stack
- Next.js (App Router) + Tailwind, deployed on Vercel
- Supabase (Postgres) via server actions / route handlers — no separate API layer
- Shared write PIN in an env var. A successful unlock creates a signed,
  HttpOnly, SameSite cookie valid for 7 days; the raw PIN is never stored in
  browser storage.
- PIN unlock attempts are rate-limited server-side. Every mutation validates
  the signed organizer cookie before using server-only Supabase credentials.
- Changing the configured PIN invalidates all previously issued organizer
  cookies.

## Data model

```sql
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- e.g. "Arup / Diptam"
  group_label text not null check (group_label in ('A','B')),
  final_rank int check (final_rank is null or final_rank > 0),
                                      -- locked snapshot, set only on finalization
  unique (group_label, final_rank)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- stable key, e.g. "GA-01" or "QF1"
  stage text not null check (stage in ('group','quarterfinal','semifinal','final')),
  group_label text check (group_label in ('A','B')),   -- null for knockout
  label text,                         -- knockout placeholder, e.g. "QF1: A1 vs B4"
  team1_id uuid references teams(id), -- nullable: knockout matches start empty
  team2_id uuid references teams(id),
  status text not null default 'unscheduled'
    check (status in ('unscheduled','scheduled','completed')),
  scheduled_at timestamptz,
  venue text,                         -- free-text court or venue
  deciding_set_format text
    check (deciding_set_format in ('full_set','match_tiebreak')),
  outcome_type text
    check (outcome_type in ('normal','retirement','walkover')),
  sets jsonb,                         -- e.g. [[6,4],[3,6],[10,7]]
  winner_id uuid references teams(id),
  played_at timestamptz,              -- actual match time, entered with result
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (team1_id is null or team2_id is null or team1_id <> team2_id),
  check (winner_id is null or winner_id = team1_id or winner_id = team2_id),
  check (
    (stage = 'group' and group_label is not null)
    or (stage <> 'group' and group_label is null)
  )
);

create table tournament_state (
  id smallint primary key default 1 check (id = 1),
  group_stage_status text not null default 'open'
    check (group_stage_status in ('open','finalized')),
  groups_finalized_at timestamptz,
  tie_resolution_note text,
  updated_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  action text not null,
  entity_type text not null,
  entity_key text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
```

Notes:
- Standings are COMPUTED (SQL view or app code), never stored/edited:
  per group, rank by wins, then head-to-head, set difference, and game
  difference.
- For a tie involving three or more teams, create a mini-table containing only
  matches between the tied teams. Rank that mini-table by wins, mini-table set
  difference, then mini-table game difference. If teams remain tied, use
  overall group set difference, then overall group game difference.
- Live standings are provisional. If the required head-to-head match or full
  tied-team mini-table has not been completed, order tied teams temporarily by
  overall set difference, then game difference, and label the table
  provisional.
- If teams remain exactly tied after every automatic rule, finalization requires
  the organizer to set their final order manually and record a reason. The
  resulting order is stored in `final_rank`; the reason is stored with the
  tournament state and audit entry.
- Score stored as an array of set scores in `sets`. Winner set explicitly
  (don't derive it) so walkovers/retirements are representable.
- Matches are best of three. Before score entry, record whether the deciding
  third set uses a full set or a 10-point match tiebreak; players choose the
  format on match day.
- Full sets use standard tiebreak-set scoring: first to six games by two, with
  7-6 allowed after a tiebreak at 6-6. A match tiebreak is first to 10 points by
  two. It counts as one set won but contributes zero games to game difference.
- Walkovers and retirements award a match win to `winner_id`, but the entire
  match is excluded from set-difference and game-difference calculations.
  Scores already played in a retirement may still be recorded for display.
- A match may move directly from unscheduled to completed.
- Score entry records an editable `played_at`, prefilled from `scheduled_at`
  when available or the current Central Time otherwise. `completed_at` records
  when the result was saved.
- An organizer may clear an unlocked result. This clears result fields and
  returns the match to scheduled when `scheduled_at` exists, otherwise to
  unscheduled.
- All entered/displayed schedule times use America/Chicago. Store timestamps as
  `timestamptz` and convert at the application boundary.
- `final_rank` is a locked snapshot created by the explicit "Finalize groups"
  action, not a manually editable standing.
- `played_at` drives completed-match ordering. `completed_at` records when the
  result was saved, and `updated_at` supports optimistic concurrency so one
  organizer cannot silently overwrite another organizer's newer edit.
- Every tournament-data mutation writes a server-only audit entry with
  timestamped before/after data. Audit records never contain the PIN, organizer
  cookie, or secrets.
- Row-level audit entries should be captured by database triggers so the data
  change and audit record commit or roll back together.
- Multi-row state transitions such as finalization, reopening, and quarterfinal
  assignment must use transactional database functions/RPCs.
- The schema migration must add consistency constraints for completed matches,
  score/outcome fields, stable match identities, and final ranks in addition to
  the illustrative checks shown above.

## Seed data (one-time script)
1. Insert 11 teams with group labels (roster from the announcement).
2. Generate all round-robin group matches (every pair within a group),
   stage='group', status='unscheduled'. 25 rows total.
3. Insert 7 knockout matches with null teams:
   QF1–QF4 (labeled with fixed matchups), SF1, SF2, Final.

## Pages
1. **Home** — tournament name/dates, links, at-a-glance: next scheduled
   matches + current group leaders.
2. **Groups** — standings table per group (P / W / L / sets diff / games diff),
   computed live from completed matches. Advancing zone (top 4) visually marked.
3. **Matches** — all matches, filterable by group/stage, grouped by status:
   scheduled (soonest first) → unscheduled → completed. Each row: teams,
   stage/round, date and venue if scheduled, score/outcome if completed.
4. **Bracket** — knockout tree rendering the 7 knockout matches, placeholders
   ("A1", "B4") until teams are filled in.
5. **Edit flows** (PIN-gated): schedule a match (set date/time and free-text
   venue), enter/update a score + winner + deciding-set format + outcome
   (status → completed), resolve a remaining standings tie, finalize/reopen
   group standings, and assign teams to a knockout match.

### Group finalization

- An organizer must explicitly select **Finalize groups** after the group stage.
- Finalization computes and stores each team's `final_rank`, then locks all
  group-match scores against editing.
- An exact tie remaining after all automatic rules requires an explicit manual
  team order and explanation during finalization.
- Correcting a group score requires an explicit **Reopen groups** action first.
- Reopening clears final ranks, finalization time, and any manual tie note.
- If quarterfinal teams have been assigned, reopening is allowed only before
  any quarterfinal has been scheduled or completed. Reopening clears all four
  quarterfinal team assignments.
- Quarterfinal teams are assigned from the locked final ranks; knockout
  progression remains manual in year one.
- Once a knockout winner has been assigned into the next round, the upstream
  result is locked until that downstream assignment is explicitly cleared.

Mobile-first: primary use is phones at the court.

## Build order

Implementation is divided into small vertical slices in `WORK_ITEMS.md`. That
file is the authoritative tracker for status, dependencies, acceptance
criteria, and validation. Work on one item per session and deploy each completed
slice when deployment credentials are available.

Cross-cutting framework, database, security, CI, deployment, testing, and
frontend implementation decisions are recorded in `TECHNICAL_DECISIONS.md`.

## Standing rules for AI coding sessions
- One slice per session; commit after each working slice.
- Run `npm run build` before declaring any slice done.
- Never change the DB schema without showing the migration first.
- Server actions for writes; no client-side Supabase writes.
- Don't add auth, user accounts, or historical/multi-tournament features.

## Confirmed rules and product decisions

1. The official tournament name is **McGraw Open**.
2. Matches are best of three; players choose a full third set or a 10-point
   match tiebreak on match day, and the selected format is stored per match.
3. Standings tiebreak order is head-to-head, set difference, then game
   difference.
4. Three-or-more-team ties use a head-to-head mini-table among tied teams
   before overall set and game difference.
5. Walkovers and retirements are supported. They award a match win but are
   excluded from set/game differential calculations.
6. Tournament times use America/Chicago (Central Time).
7. Scheduled matches include a free-text venue/court.
8. Group standings must be explicitly finalized and locked. Group score
   corrections require reopening the group stage first.
9. Any exact tie remaining after all automatic rules is manually ordered by an
   organizer with a required explanatory note.
10. Reopening groups clears assigned quarterfinal teams and is prohibited after
    any quarterfinal is scheduled or completed.
11. A knockout result is locked after its winner is assigned downstream until
    that downstream assignment is cleared.
12. The raw shared PIN is not stored in localStorage. A successful unlock uses
    a signed HttpOnly organizer cookie valid for 7 days.
13. Full sets use standard tiebreak-set scoring. A 10-point match tiebreak
    counts as a set but not as games for standings.
14. An unscheduled match may be entered directly as completed.
15. All tournament-data mutations create a timestamped, server-only
    before/after audit record.
16. Live standings use overall set/game difference provisionally when required
    head-to-head matches are incomplete.
17. Completed matches store the actual played date/time separately from the
    result-entry timestamp.
18. An unlocked result can be cleared, returning the match to scheduled when a
    schedule exists or unscheduled otherwise.

## Out of scope (year one)
User accounts, live scoring, public historical-result browsing, automatic
bracket progression, notifications, player registration (teams are
pre-assigned). The audit log is operational recovery data, not a public
historical-results feature.