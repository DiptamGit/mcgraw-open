# McGraw Open Design System — Night Match

**Status:** Locked design direction, version 2.0
**Approved:** August 5, 2026
**Replaces:** Version 1.0 (Blue Court, light canvas, Barlow type)
**Applies to:** MGO-024 through MGO-030 and every later UI slice

This file is the visual and interaction source of truth for McGraw Open.
Product rules in `SPEC.md` and engineering constraints in
`TECHNICAL_DECISIONS.md` remain authoritative for behavior. When later UI work
introduces a new pattern it must extend this system rather than start a
separate visual language.

Version 2.0 is a foundational replacement approved by the tournament owner and
derived from the signed-off mockups. Where this document and an older
implementation disagree, this document wins.

**Provenance.** The approved mockups live at `McGraw Open Mockups.html` in the
repository root. They cover six screens — Home, Groups, Matches, Bracket,
Schedule, and Record result — each at desktop and phone widths. Open that file
in a browser when rebuilding a screen. Where the mockups and this document
disagree on a measurement, this document wins, because it applies the
accessibility floor the mockups' prototype markup does not.

## Product context

McGraw Open is a local doubles tennis tournament used primarily on phones at
the court. The interface has two jobs:

1. Let participants scan schedules, results, standings, and the bracket fast.
2. Let an organizer make careful updates without losing context or data.

## Direction

**Night Match.** Competitive, premium, cinematic "big stage" tennis. A dark
court at night, one loud volt-green accent, and a calm court-blue for
information. Confident and terse. No clutter, no cuteness, no generic
dashboard.

### Core principles

1. **Court-side clarity comes first.** Content stays legible at 320px, in one
   hand, at 200% zoom. Decoration never reduces contrast or slows down finding
   a match.
2. **Poster energy frames the data.** Brand expression lives in the wordmark,
   display headlines, court linework, and the bracket. Match lists, standings,
   and forms stay quiet and comparable.
3. **Two accents, maximum.** Volt is the loud one. Court blue is the calm,
   informational one. Never put a third accent on screen.
4. **One bold device per region.** The self-drawing bracket is the signature.
   Nothing else competes with it.
5. **State is never color-only.** Every status carries text, and an icon or
   pattern where useful.
6. **Public and organizer views are one product.** Organizer controls add a
   labeled layer to the public interface. There is no separate admin theme.

## Color

Define every value as a CSS custom property in `app/globals.css` and expose it
through Tailwind's `@theme inline`. Never inline a raw hex in a component.

### Brand accents

| Token | Hex | Use |
|---|---|---|
| `--volt-500` | `#d6ff3f` | Signature accent: primary action, key numbers, current item, champion path |
| `--volt-600` | `#b8e62e` | Volt active/pressed |
| `--court-500` | `#3457ea` | Secondary accent: informational fills, Group B marker, secondary action |
| `--court-700` | `#1b3196` | Deep court blue, pressed state |
| `--court-200` | `#a9b8ff` | Court-blue **text** on dark surfaces |

### Ink neutrals

`--ink-950 #07090c` · `--ink-900 #0d1117` · `--ink-850 #12171f` ·
`--ink-800 #161c26` · `--ink-700 #232b38` · `--ink-600 #333d4d` ·
`--ink-500 #5b6779` · `--ink-400 #7a869a` · `--ink-300 #9aa5b6` ·
`--ink-200 #c2cad6` · `--ink-100 #dfe4eb` · `--ink-50 #f3f5f8` ·
`--white #ffffff`

### Semantic

`--success #3fe0a5` · `--warning #ffb020` · `--danger #ff5a5f`

Each semantic color also has a surface form built as a low-alpha tint of itself
over the page, paired with a matching border tint — for example the success
callout uses `rgba(63,224,165,.10)` fill with `rgba(63,224,165,.30)` border.

### Aliases

Components use aliases, not raw scale values.

- Surfaces: `--bg-page` (ink-950) · `--bg-surface` (ink-900) ·
  `--bg-surface-alt` (ink-850) · `--bg-elevated` (ink-800)
- Borders: `--border-hairline` (ink-800) · `--border-subtle` (ink-700) ·
  `--border-strong` (ink-600)
- Text: `--text-primary` (white) · `--text-secondary` (ink-200) ·
  `--text-muted` (ink-300) · `--text-dim` (ink-400) ·
  `--text-on-accent` (ink-950)
- Accents: `--accent-primary` (volt-500) · `--accent-secondary` (court-500) ·
  `--accent-info-text` (court-200)

### Verified contrast and the legibility floor

These ratios are measured against `--bg-page` (`#07090c`). All approved pairs
meet WCAG AA for normal text.

| Foreground | Ratio | Verdict |
|---|---:|---|
| `--white` | 19.6:1 | Primary text |
| `--volt-500` | 17.3:1 | Accent text, key numbers |
| `--success` | 11.8:1 | Completed, winner |
| `--warning` | 10.9:1 | Provisional, tie, retirement |
| `--court-200` | 10.4:1 | Informational text |
| `--danger` | 6.5:1 | Errors, destructive actions |
| `--ink-300` | 7.5:1 | Default secondary text |
| `--ink-400` | 5.4:1 | Dimmest permitted text |
| `--ink-500` | 3.5:1 | **Not text below 24px** |

Locked rules:

- **Minimum real text size is 12px.** The mockups use 9–11px micro-labels for
  visual density; reproduce that density with 12px and tighter tracking, never
  by going below 12px. Purely decorative, `aria-hidden` glyphs are exempt.
- `--ink-400` is the dimmest text permitted, and only for short labels and
  metadata. Sustained reading copy uses `--ink-300` or lighter.
- `--ink-500` and darker are borders, dividers, and non-text marks. They may
  only carry text at 24px or larger.
- `--court-500` is a **fill or border, never text on a dark surface.** Use
  `--court-200` for blue text. White on a `--court-500` fill is 5.7:1 and is
  approved.
- Never set body copy in `--volt-500`. It marks one thing per region.
- Contrast on `--bg-surface-alt` drops by roughly 10%. Re-check any pair that
  measures under 5:1 on the page before using it on a raised card.

## Typography

| Role | Family | Token | Use |
|---|---|---|---|
| Display | Anton | `--font-display` | Headlines, page titles, group names, scores, the wordmark. **Always uppercase.** |
| Body / UI | Inter | `--font-body` | Everything else. Sentence case. |
| Mono | Roboto Mono | `--font-mono` | Scores, standings figures, dates, times, match codes |

Load all three with `next/font/google`. No serif anywhere. No runtime font CDN.

### Scale

`--display-2xl` clamp(3.5rem, 8vw, 6rem) · `--display-xl` clamp(2.75rem, 6vw,
4rem) · `--display-lg` clamp(2rem, 4.5vw, 2.75rem) · `--display-md` 2rem ·
`--heading-lg` 1.75rem · `--heading-md` 1.375rem · `--heading-sm` 1.125rem ·
`--body-lg` 1.125rem · `--body-md` 1rem · `--body-sm` 0.875rem ·
`--caption` 0.75rem · `--eyebrow` 0.75rem

`--caption` and `--eyebrow` at 0.75rem are the floor. Nothing smaller ships.

Line height: `--lh-tight` 1.02 (display) · `--lh-snug` 1.2 · `--lh-normal` 1.5.
Tracking: `--tracking-tight` -0.02em (display) · `--tracking-wide` 0.06em ·
`--tracking-wider` 0.14em (uppercase eyebrows and labels).

### Rules

- Display type is uppercase and tight. Never justify it, never set a paragraph
  in it.
- Numbers that are compared across rows — scores, set counts, differentials,
  ranks, times — use `--font-mono` with tabular figures so columns align.
- Team names inside a mono table cell switch back to Inter; only the figures
  are mono.
- Eyebrows are uppercase, `--tracking-wider`, and either `--volt-500` for an
  active or branded region or `--ink-400` for a quiet one.

## Spacing and layout

4px base: `--space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 ·
`10` 40 · `12` 48 · `16` 64 · `20` 80 · `24` 96 · `32` 128.

`--container-max` 1200px. Gutter 24px on desktop, 18px on phone.

Breakpoints: phone-first base, `640px` for two-column card grids, `900px` for
the twin standings layout and the horizontal bracket, `1200px` for the full
container.

The page itself never scrolls horizontally at any width. A dense table may
scroll inside its own labeled, focusable container.

## Radius, depth, and motion

- Radius: `--radius-none` 0 (score chips, rails, date blocks) · `--radius-sm` 6
  · `--radius-md` 10 · `--radius-lg` 14 (cards) · `--radius-xl` 24 ·
  `--radius-pill` 999 (buttons, chips, badges). Sharp and pill side by side is
  a deliberate motif.
- Depth comes from 1px hairline borders and surface steps, not heavy shadows.
  `--shadow-card` and `--shadow-elevated` exist but stay subtle.
- **Glow system (signature).** `--glow-volt` and `--glow-court` are colored
  box-shadows used instead of a neutral shadow on interactive accents.
- Motion is ease-out only, 120–220ms: `--duration-fast` 120ms,
  `--duration-med` 220ms. No bounce, no spring.

### Motion budget

Exactly four animations ship. Anything else needs an update to this file.

1. The bracket connectors drawing themselves in, and the volt ball travelling
   the champion path. This is the signature.
2. The "next on court" pulse dot.
3. Hover lift and glow on buttons and interactive cards.
4. Focus glow on inputs.

Every one of them must have a static, fully legible resting state under
`prefers-reduced-motion: reduce`. The bracket in particular renders its final
drawn state immediately with no ball when motion is reduced. Animation never
gates content: the page is complete and readable before any animation runs.

## Interaction states

- **Hover:** primary button lifts 2px and gains `--glow-volt`. Secondary gains
  `--glow-court`. Interactive cards lift 3px. Glows, not color washes.
- **Press:** 0.97 scale, `--duration-fast`.
- **Focus:** a visible 2px `--volt-500` ring plus `--glow-volt`, on every
  focusable element including links, chips, table scroll containers, and
  buttons. Focus is never removed and never relies on the glow alone.
- **Disabled:** 45% opacity, `not-allowed` cursor, and a text reason nearby
  when the control is locked by tournament state.
- **Touch targets:** every interactive control is at least 44×44px including
  padding. Filter chips and badges that are not interactive are exempt.

## Backgrounds and the court device

There is no photography in this system. No stock imagery, no illustration, no
decorative gradients beyond the two described here.

- **Court linework** is the atmospheric device: a white, 1.4px-stroke tennis
  court drawn in SVG at 14–18% opacity, absolutely positioned behind hero
  regions and marked `aria-hidden`. Baseline rectangle, service boxes, centre
  line, net line. It is never traced over content that must be read.
- **Court glow** is the second device: a court-blue radial gradient in the
  upper right of a hero, optionally a faint volt radial in the lower left,
  both over `--ink-950`.

Everywhere else the surface is flat `--ink-950` or `--ink-900`.

## Iconography

Use `@phosphor-icons/react`, already a project dependency, at 1.5 stroke
weight on a 24px grid. Import individual icons so the bundle stays small.

DESIGN.md v2.0 replaces the Lucide-CDN placeholder from the portable system
draft: no icon CDN, no Content Security Policy exception, and no runtime
request for an icon set.

The mockups use unicode glyphs such as `◷`, `◎`, `✓`, and `🏆` as prototyping
shorthand. Ship the equivalent Phosphor icon instead. **No emoji ships.** Every
icon is `aria-hidden` and accompanied by text.

## Wordmark

No logo mark exists. The wordmark is type: **McGRAW** in `--white` followed by
**OPEN** in `--volt-500`, set in Anton, uppercase, with `--tracking-tight`. It
links to the home page and carries an accessible name of "McGraw Open home".

## Voice and content

- Short, confident, fragment-forward. "Twelve doubles teams. Two groups. One
  late-summer title decided under the lights."
- Display headlines read all-caps by style, not by typing capitals into the
  content. Body is sentence case. Buttons are Title Case.
- Name things by what a person controls: "Record result", not "Submit".
- An action keeps its name through the whole flow. "Save schedule" produces
  "Schedule saved".
- Errors state what happened and what to do next, in the interface's voice.
  They do not apologize and are never vague.
- Empty states are an invitation to act, not an apology.
- Stats appear sparingly with a one-word label, four at most in a region.
- All counts and stats come from live tournament data. Never hard-code a
  fixture or team count into copy.

## Components

All components are built with semantic HTML and project CSS. Do not add a
component library. Add a small headless primitive only for a real interaction
problem, and record it here.

| Component | Purpose |
|---|---|
| `Button` | `volt` primary · `court` secondary fill · `outline` · `ghost`; sizes sm/md/lg; pill radius |
| `Badge` | Status pill: live, scheduled, completed, unscheduled, locked, warning |
| `Chip` | Filter and option toggle; pill; `on` state fills `--court-500` with white text |
| `Card` | `--bg-surface-alt` on `--border-subtle`, `--radius-lg`; optional interactive lift |
| `GroupShield` | 38px square, `--radius-sm`, Anton letter. Group A is a solid volt shield with ink text. Group B is a court-blue shield with white text **and a 45° hatch pattern**, so the two groups differ by shape as well as color. |
| `Eyebrow` | Uppercase micro-heading, `--tracking-wider` |
| `Stat` | Large Anton number over a one-word uppercase label |
| `PulseDot` | 9px volt dot with an expanding ring, for a live or imminent item |
| `Input` / `Select` | 48px control, `--bg-surface-alt`, `--border-subtle`, volt focus glow, label above, error text below |
| `MatchCard` | Fixture card: context line, status badge, teams, meta row, organizer action row |
| `StandingsTable` | Semantic table with an advancing rail, cut-line divider, and mono figures |
| `BracketBoard` | The knockout draw and its self-drawing connectors |
| `OrganizerBanner` | Full-width volt-tinted strip marking organizer mode |
| `Accordion` | Native `<details>/<summary>` disclosure group on a `--bg-surface-alt` card: hairline-divided rows, a ≥44px summary, a Phosphor caret that indicates open/closed state, and an instant, non-animated toggle so it stays within the motion budget |

### Team name treatment

Team names are stored as `"Nickname - Player One / Player Two"`. Everywhere a
team appears, split on the first `" - "` and render the nickname in bold Inter
as the primary label, with the player pair as dim secondary text. If a name has
no separator, render the whole string as the primary label and show no
secondary line. This is presentation only; the stored value never changes.

### Status vocabulary

| State | Badge text | Color | Non-color cue |
|---|---|---|---|
| Scheduled | Scheduled | court tint | clock icon |
| Unscheduled | Unscheduled | dim | dashed border |
| Completed | Completed | success | check icon |
| Provisional standings | Live standings | success dot | the word "Live" |
| Tie at the cut line | Cut-line tie | warning | warning icon, warning rail |
| Locked by finalization | Locked | neutral | lock icon |
| Retirement / walkover | Retired / Walkover | warning | text on the score row |

## Navigation model

- **Header** is sticky, `--bg-page` at 90% with a blur, hairline bottom border.
  It holds the wordmark on the left. On screens ≥900px it also holds the
  four primary links on the right.
- **Organizer control.** The header carries the organizer entry point at
  **every** width, because the phone bottom bar is reserved for the four public
  routes and there is no hamburger menu. Below 900px it is an icon-only
  outlined pill with an accessible name; at 900px and above it also shows the
  "Organizer" label. It appears only while organizer mode is locked — once
  unlocked, the banner below the header owns the lock control, so the header
  does not offer a second, duplicate affordance.
- **Primary routes** are Home, Groups, Matches, Bracket, in that order.
- **Phone navigation** is a fixed bottom tab bar with the same four routes,
  each a 44px-tall target with a label. The active tab is volt with a marker.
  There is no hamburger menu; the mockup's `☰` glyph is not implemented.
  Reserve bottom padding on every page equal to the bar height so content is
  never hidden behind it.
- The active route is marked with `aria-current="page"` and a visual marker,
  never by color alone.

## Organizer layer

- When a valid organizer cookie is present, an `OrganizerBanner` sits directly
  below the header on every page: a volt-tinted strip reading
  `● ORGANIZER MODE`, a short explanation, and a "Lock again" control on the
  right. While locked, the banner is absent and the header's organizer control
  is the single unlock entry point.
- Organizer actions appear inline on the object they affect — a match card
  gets "Schedule match", "Reschedule", or "Record result"; the groups page
  gets a finalization panel at the bottom.
- Destructive or clearing actions are `--danger` text buttons, positioned away
  from the primary action, and always confirm what will be cleared.
- Locked actions render disabled with a plain-language reason.

## Page specifications

Each specification describes the approved mockup. Desktop and phone layouts are
both required. Data shown is illustrative; every value comes from live data.

### 1. Home

- **Hero** on `--ink-950` with the court-line SVG and court-blue radial glow.
  A pill eyebrow reads the tournament window. The headline is display-2xl,
  two lines, with the final word in volt. The approved copy is locked:
  - Headline: **"Nine to five. Then they serve."** with "serve." in volt.
  - Subhead: **"Twelve doubles teams. Two groups. One late-summer title
    decided under the lights."** The phone may shorten the subhead to
    "Twelve doubles teams. Two groups. One title."
  - Actions: "View the bracket" (volt) and "Full schedule" (outline).
- **Next on court** card. On desktop it floats over the right of the hero at
  `--bg-surface` 86% with a blur; on phone it sits below the hero full width.
  It shows a pulse dot, the "Next on court" eyebrow, a schedule badge, the
  stage and venue line, both teams with a display "VS" divider. When nothing is
  scheduled it becomes an empty state pointing at the fixture list.
- **Stat strip**, four cells divided by hairlines, Anton numerals over
  uppercase labels: teams, groups, matches, and one trophy. First and last
  numbers are volt. Counts derive from live data. Phone shows a 2×2 grid.
- **Group leaders**, one card per group with the group shield, the leading
  team or joint leaders, and wins/played. Empty until a first result exists.
- **Bracket teaser**, a small self-drawing connector graphic linking to the
  bracket. Under reduced motion it renders drawn and static.
- **Rules & format** section, anchored below the bracket teaser with a stable
  `id` so it can be linked. An `--ink-400` eyebrow and a display heading over a
  single `Accordion` on a `--bg-surface-alt` card. Each category — Tournament
  format, Match rules, Starting the match — is one `<details>` disclosure with
  the first open, followed by a quiet closing line. Content is static repository
  copy, never a query, and has no empty, loading, or error state. Figures such
  as scores and change-end games use `--font-mono`. The disclosure toggles
  instantly with no height or opacity animation, so it adds nothing to the
  motion budget; the caret is a static open/closed indicator that is fully
  legible under `prefers-reduced-motion`.

### 2. Groups

- Page intro with a "Round robin" eyebrow, display "Groups" title, and a
  success-dot "Live standings" marker whenever standings are provisional, with
  a sentence explaining that provisional order uses overall set and game
  difference.
- **Desktop:** two standings tables side by side, separated by a hairline.
  **Phone:** one table at a time with a chip control switching Group A and
  Group B; both tables remain in the DOM and reachable.
- Each table has a header row with the group shield, the group name, an
  "N of 15 complete" count, and a state badge — "Live", or "Cut-line tie" in
  warning when `unresolvedTies` touches the top four.
- Columns are rank, team, P, W, L, sets, games. Phone drops P, L, and games.
  Figures are mono; team names are Inter.
- The **advancing rail** is a 3px inset left rail on each of the top four rows:
  volt for Group A, court blue for Group B, warning for a row inside a
  cut-line tie. Rank one also carries a faint volt gradient wash.
- Rows one through four carry a small "Advancing" label; a tied row carries
  "Cut-line tie". A 2px dashed divider separates rank four from rank five.
  The rail is never the only cue.
- Finalized standings replace the live marker with a "Locked" badge and show
  the stored final ranks and any manual tie note.
- **Organizer:** a finalization panel below both tables explaining that
  finalization snapshots the tables and locks group score editing, with the
  primary action. When groups are finalized the panel offers reopening and
  states the conditions that block it.

### 3. Matches

- Page intro with a "Schedule and results" eyebrow and display "Matches".
- A **sticky filter bar** directly under the intro: `--bg-surface` at 90% with
  a blur and a hairline bottom border. Group chips, a hairline divider, stage
  chips, and a right-aligned live result count. On phone the bar scrolls
  horizontally within itself and stays sticky.
- Sections in order — Scheduled, Unscheduled, Completed — each introduced by an
  eyebrow and a count.
- **Match card:** context line (`GROUP A · A5`) and status badge on top; the
  two teams with a display "VS" between them on desktop and stacked on phone;
  a meta row with time in Central Time and venue; then, for organizers, an
  action row separated by a hairline.
- A completed card replaces the meta row with a two-row score table: winner in
  white with a "Winner" badge, loser in dim, set scores in mono. A match
  tiebreak column is visually distinct from full-set columns and labelled
  "MTB". Retirements and walkovers state the outcome in words.
- Zero results shows a specific empty state naming the active filters and
  offering to clear them.

### 4. Bracket

- Page intro with a "Knockout stage" eyebrow, display "The bracket", and the
  court-blue radial glow.
- **Desktop (≥900px):** a four-column grid — Quarterfinals, Semifinals, Final,
  Champion — with an absolutely positioned SVG layer behind the cards drawing
  the connectors. Base connectors are `--border-subtle`. The champion's path is
  a 3px volt stroke that draws itself in over 2.4s ease-out, followed by a 6px
  volt ball travelling that path once. Rounds are labelled with eyebrows.
- **Phone:** the same rounds stacked vertically, QF → SF → Final, with the
  connector SVG redrawn for the vertical layout. Cards are full width.
- Each match card shows its code and source label (`QF1 · A1 vs B4`,
  `SF1 · W-QF1 vs W-QF2`), both teams, and set scores when completed. The
  advancing team is volt; the eliminated team is dim.
- Unassigned slots show their placeholder label — "Winner QF3", "A1" — in dim
  text, never an empty row.
- The Final card is the one elevated moment: a volt-tinted gradient, a volt
  border, `--glow-volt`, and a "Championship" eyebrow.
- The Champion cell is a dashed volt-bordered panel with a trophy icon that
  reads "Awaits the final" until the final is complete, then names the winner.
- The whole board is accessible DOM content. The SVG is decorative and
  `aria-hidden`; no result is conveyed only by a drawn line.

### 5. Schedule a match (organizer)

- A focused single-task page capped at 640px on desktop and full width on
  phone. Organizer banner, a back link to Matches, an eyebrow with the match
  code, and the display title "Schedule match" over the two team names.
- A read-only "Current match" card repeats the fixture context and status.
- The form section carries a "Central Time" eyebrow and a sentence explaining
  that players see the schedule as soon as it is saved.
- Fields: Date and Start time side by side on desktop and stacked on phone,
  then a full-width Court / venue field. Controls are 48px, mono for date and
  time.
- Desktop places "Save schedule" and "Cancel" in a row. **Phone uses a sticky
  bottom save bar** with a gradient fade into the page.
- Validation errors appear under the offending field and are summarized above
  the actions. Pending state disables the primary action and names what is
  happening. A stale-write conflict explains that someone else saved a newer
  version and offers to reload.

### 6. Record a result (organizer)

- Same focused shell as the schedule page: banner, back link, `B2 · Match
  result` eyebrow, display "Record result", both team names.
- A "Best of three" eyebrow over the display subheading.
- **Score grid.** Desktop is a four-column grid — team, S1, S2, MTB — with 52px
  mono score inputs. Phone drops to three columns at 46px and stays usable at
  320px. The MTB column is visually distinct with a dashed border and a warning
  header, and is only enabled when the deciding-set format is a match tiebreak.
- Each team row starts with a winner radio; the selected radio is a volt ring
  with a volt centre and a visible label.
- Chip groups for Outcome — Normal, Retirement, Walkover — and Deciding set
  format — Full set, Match tiebreak.
- A success-tinted callout restates the derived outcome in words, for example
  "Winner: Spin Doctors — two sets to love". It updates as entry changes.
- Actions: "Clear result" as a danger text button on the left, "Cancel" and
  "Record result" on the right. Phone stacks the primary action full width with
  the clear action beneath.
- When a result is locked by finalization or a downstream assignment, the form
  renders read-only with a "Locked" badge and states exactly which action would
  unlock it.

### Supporting screens

The mockups do not cover these. Build them by extension, with no new visual
patterns.

- **Organizer unlock:** the focused single-task shell, a court-line hero strip,
  one PIN field, and a clear rate-limit message that never reveals whether a
  PIN was close. It never echoes the entered PIN.
- **Finalize groups / Reopen groups:** the focused shell showing the ranks or
  consequences about to be committed, any required manual tie order and reason,
  and a primary action. Reopening states plainly that it clears final ranks and
  quarterfinal assignments.
- **Quarterfinal and knockout assignment:** the focused shell with the source
  slots, the teams to assign, and the downstream effects of the change.
- **Loading:** skeletons that match the real layout's shape and spacing on
  `--bg-surface-alt`, with a reduced-motion-safe shimmer.
- **Error and 404:** the court-line device, a display headline, a plain
  explanation, and a route back to Home or Matches.
- **Open Graph image and favicon:** the wordmark on `--ink-950` with the court
  line device, using the volt accent.

## Accessibility floor

Every slice meets all of these before it is complete.

- WCAG AA contrast on all text, verified against the table above.
- Minimum 12px real text; minimum 44×44px interactive targets.
- Visible volt focus ring on every focusable element, never removed.
- Full keyboard operation, including filter chips, the bottom tab bar, and any
  scrollable table container, which must be focusable and labelled.
- Semantic HTML: real `table`, `th`, `caption` for standings; real `form`,
  `label`, `fieldset`, and `legend` for organizer forms; real headings in order.
- Standings and the bracket are DOM content, never canvas-only.
- No page-level horizontal overflow at 320px or at 200% zoom.
- No information conveyed by color alone.
- `prefers-reduced-motion: reduce` disables the four permitted animations and
  leaves every resting state fully legible.
- Live-updating counts and status changes are announced politely where they
  matter, and never trap or steal focus.

## Extending this system

Foundational changes — the palette, the three typefaces, the surface strategy,
the shape language, the navigation model, the bracket signature, or the
responsive bracket approach — require explicit approval from the tournament
owner and an update to this file **before** implementation.

Component-level gaps may be filled during a work item as long as the result
uses these tokens, respects the accessibility floor, and is recorded here in
the same session.
