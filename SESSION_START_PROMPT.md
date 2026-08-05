# Reusable McGraw Open development-session prompt

Copy the prompt below into a new session and replace `MGO-XXX` with the work
item you want to complete.

---

You are continuing development of the McGraw Open 2026 tournament website.

**Work item for this session: `MGO-XXX`**

Complete this one work item end-to-end. Do not start another work item or expand
the feature set unless I explicitly request it.

## Load project context first

Before proposing or changing anything:

1. Read `AGENTS.md`.
2. Read `SPEC.md` completely.
3. Read `TECHNICAL_DECISIONS.md` completely.
4. Read `WORK_ITEMS.md`, including:
   - the Current queue row for `MGO-XXX`;
   - the complete detailed section for `MGO-XXX`;
   - every dependency listed for it.
5. If the item includes UI or UX work, read `DESIGN.md` completely before
   proposing or changing the interface.
6. Inspect the current repository structure, package scripts, Git status, and
   relevant existing implementation.
7. Treat those project files as the source of truth. Do not rely on assumptions
   from previous sessions.

## Confirm readiness

- Verify every dependency for `MGO-XXX` is marked **Done**.
- If a dependency is incomplete, stop and explain the blocker rather than
  bypassing it.
- Check for uncommitted or unexpected existing changes. Preserve changes you
  did not create and stop for guidance only if they conflict with this item.
- Identify external requirements such as Docker, Supabase, Vercel, GitHub, or
  credentials. Attempt all safe local work first; ask only when user input is
  genuinely required.
- Update only the Current queue row for `MGO-XXX` to **In progress** before
  implementation begins.

## Implementation rules

- Implement the complete scope and acceptance criteria written for `MGO-XXX`.
- Keep changes surgical and limited to this slice, while covering all surfaces
  needed for the feature to work correctly.
- Follow the architecture, environment, security, testing, and design decisions
  in `TECHNICAL_DECISIONS.md`.
- Follow all tournament and scoring behavior in `SPEC.md`.
- For UI or UX work, follow the locked system in `DESIGN.md`.
- Reuse established project helpers and patterns before introducing new ones.
- Keep TypeScript strict and avoid unsafe casts or silent fallbacks.
- Surface errors clearly; do not turn failures into empty or successful states.
- Keep Supabase access server-only. Never expose service-role credentials or
  perform browser-side database writes.
- Validate all mutations on the server, including organizer authorization,
  input validation, concurrency rules, and tournament locks.
- Preserve mobile-first behavior, accessibility, and current iOS Safari and
  Android Chrome support.
- Do not add authentication accounts, a separate API layer, global client
  state, a full UI component library, PWA/offline support, or other out-of-scope
  architecture.

## Database changes

If the work item requires a schema, policy, trigger, function, or seed change:

1. Create a versioned Supabase migration.
2. Show me the complete migration and explain its effect before applying it.
3. Wait for approval before applying it.
4. Test it with the local Supabase Docker environment first.
5. Run a clean local database reset when appropriate.
6. Regenerate committed database types after schema changes.
7. Apply to staging only when the work item requires preview validation and
   access is available.
8. Never apply a production migration automatically or without an explicit,
   backed-up production release step.

## Design work

For UI or UX work:

- Read and follow `DESIGN.md` as the approved visual and interaction source of
  truth. `DESIGN.md` v2.0 (Night Match) is the current locked system.
- Invoke and follow the project-local `frontend-design` skill.
- Use the installed UI/UX Pro Max prompt and search tools where relevant.
- Use design guidance to implement the locked direction or fill a documented
  component-level gap, not to generate a replacement direction.
- Do not change the palette, typography, signature device, surface strategy,
  shape language, navigation model, or responsive bracket model without
  explicit user approval. Update `DESIGN.md` first after approval.
- Use semantic HTML, CSS-variable design tokens, Tailwind, `next/font`, visible
  focus, WCAG AA contrast, reduced-motion support, and at least 44px primary
  touch targets.
- Avoid generic dashboard styling, unnecessary animation, and information
  conveyed only through color.

## Validation and completion

Use the smallest existing checks that fully cover the changed behavior, then
run every validation step listed under `MGO-XXX`.

At minimum before declaring the item complete:

- run relevant automated tests;
- run `npm run lint`;
- run `npm run build`;
- exercise the acceptance criteria directly;
- check mobile behavior when UI changed;
- check authorization, invalid input, stale writes, and audit behavior when a
  mutation changed;
- verify no secrets or server-only values entered the browser bundle;
- deploy the slice when its work item requires deployment and access is
  available.

Do not mark the item complete if a required acceptance criterion is unverified.
If blocked, change its queue status to **Blocked** and add a concise reason
under its detailed section.

When all acceptance criteria pass:

1. Update the Current queue row for `MGO-XXX` to **Done**.
2. Add a short implementation note under the detailed item only when the final
   implementation materially differs from the planned scope.
3. Commit the completed slice with a focused commit message.
4. Report the outcome concisely: what changed and any genuine remaining
   limitation or required external follow-up.

Begin by loading the project context and checking whether `MGO-XXX` is ready.

---

## Example

Replace:

```text
Work item for this session: MGO-XXX
```

with:

```text
Work item for this session: MGO-001
```
