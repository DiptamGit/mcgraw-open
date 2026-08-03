# McGraw Open project instructions

Before starting work:

1. Read `SPEC.md` for the product rules and technical constraints.
2. Read `TECHNICAL_DECISIONS.md` for architecture and deployment constraints.
3. Read `WORK_ITEMS.md` for the ordered implementation tracker.
4. Before any UI or UX work, read `DESIGN.md` completely and treat it as the
   locked design source of truth.
5. When a session targets a work item, follow `SESSION_START_PROMPT.md`.
6. Select one work item whose dependencies are complete.
7. Mark that item **In progress** before making changes.

Work on one slice per session unless the user explicitly changes the scope.
Meet the work item's acceptance criteria, run its validation steps, and update
its status and notes before finishing.

For database changes, show the migration to the user before applying it.
All writes must use server actions or route handlers and validate the signed
organizer cookie on the server. The raw shared PIN is used only by the unlock
flow and must never be stored in browser storage, cookies, logs, audit records,
or Supabase. Never write to Supabase directly from client code.

Use the project-local frontend design and UI/UX Pro Max guidance to implement
or deliberately extend the approved system in `DESIGN.md`, not to replace it
with a new direction. Foundational design changes require explicit user
approval and an update to `DESIGN.md` first. Preserve the mobile-first
requirement and the rules in `SPEC.md`.
