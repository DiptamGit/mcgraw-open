# McGraw Open Design System

**Status:** Locked design direction, version 1.0  
**Approved:** August 2, 2026  
**Applies to:** MGO-006 through MGO-022

This file is the visual and interaction source of truth for McGraw Open. Product
rules in `SPEC.md` and engineering constraints in `TECHNICAL_DECISIONS.md`
remain authoritative. When later UI work introduces a new pattern, it must
extend this system rather than create a separate visual language.

## Product context

McGraw Open is a local doubles tennis tournament used primarily on phones at
the court. The interface has two jobs:

1. Let participants scan schedules, results, standings, and the bracket fast.
2. Let an organizer make careful updates without losing context or data.

The site should feel like a distinctive tournament poster translated into a
dependable court-side tool. It must not feel like a generic SaaS dashboard,
sports betting product, or professional-tour imitation.

## Reference synthesis

The files in `images/` are visual references only. Do not ship, trace, or
reproduce them in the site.

The useful shared traits are:

- bold condensed tournament-poster typography;
- deep blue hardcourt surfaces with white linework;
- tennis-ball yellow used as a sharp point of emphasis;
- oversized dates, scores, and matchup labels;
- compact, high-contrast schedule structures;
- cropped court, racket, ball, and player imagery;
- crisp geometric blocks rather than soft dashboard cards.

The final system is original and is named **Blue Court / Night Match**.

## Core principles

### 1. Court-side clarity comes first

Important content must remain legible in bright outdoor conditions, at 320px,
and while held in one hand. Decorative choices may never reduce contrast,
obscure data, or increase the time needed to find a match.

### 2. Poster energy frames the data

Brand expression belongs in the wordmark, title bands, court-line geometry,
and selected imagery. Match lists, forms, standings, and bracket cards remain
quiet, structured, and easy to compare.

### 3. Structure carries meaning

Lines, labels, badges, and markers communicate route, stage, group, status, or
progression. Do not add arbitrary numbering, ornamental rules, or decorative
court markings that encode nothing.

### 4. One bold device per region

The court-line system is the signature. Do not compete with it using multiple
gradients, floating shapes, oversized icons, and decorative animation in the
same region.

### 5. State is never color-only

Every status uses text and, where useful, an icon or pattern. Color reinforces
meaning but never carries it alone.

### 6. Public and organizer views are one product

Organizer controls add a clear functional layer to the public interface. They
do not introduce a separate admin dashboard theme.

## Visual direction

### Brand palette

| Token | Value | Role |
|---|---:|---|
| Center Court Navy | `#071A33` | Header, hero, inverse surfaces, primary ink |
| Hardcourt Blue | `#1646A0` | Links, secondary actions, selected controls |
| Tennis Ball | `#D7FF3F` | Primary action, active/current marker, rare highlight |
| Court Ice | `#EEF5FF` | Page canvas, alternate rows, quiet panels |
| Line White | `#FFFFFF` | Court lines, cards, text on dark surfaces |
| Score Ink | `#0B1324` | Primary text on light surfaces |

All approved core pairs exceed WCAG AA:

- Line White on Center Court Navy;
- Line White on Hardcourt Blue;
- Tennis Ball on Center Court Navy;
- Tennis Ball on Hardcourt Blue;
- Score Ink on Court Ice or Line White;
- Center Court Navy on Tennis Ball.

### Supporting neutrals and semantic colors

These colors communicate UI meaning and are not additional brand accents.

| Token | Value | Use |
|---|---:|---|
| Muted Ink | `#52657A` | Secondary text on light surfaces |
| Court Line | `#C7D8F2` | Borders, separators, table grid |
| Success | `#147A4A` | Completed/saved state |
| Success Surface | `#E8F5EE` | Success background |
| Warning | `#8A5600` | Provisional, retirement, walkover, caution |
| Warning Surface | `#FFF3D6` | Warning background |
| Danger | `#B42318` | Errors, conflicts, destructive actions |
| Danger Surface | `#FDECEA` | Error background |

### Color rules

- Tennis Ball is scarce. Reserve it for one primary action, the active route,
  the current item, or one key fact in a region.
- Never set long body copy in Tennis Ball.
- Dense data lives on Line White or Court Ice, not on dark blue.
- Center Court Navy may frame a page but must not turn every card dark.
- Gradients are not a default surface. A subtle navy-to-blue image overlay is
  allowed only in a hero or social image when needed for text contrast.
- Group A and Group B do not receive separate brand palettes.

### Fixed mixed theme

Year one uses one intentional mixed theme:

- Center Court Navy for the global shell and title/hero bands;
- Line White and Court Ice for content and data;
- Hardcourt Blue for interactive emphasis;
- Tennis Ball for active/current/primary emphasis.

Do not add a theme toggle or a parallel dark mode unless the product scope is
explicitly changed.

## Typography

Load fonts through `next/font` only.

| Role | Typeface | Weight | Use |
|---|---|---:|---|
| Display | Barlow Condensed | 700-800 | Wordmark, page titles, scores, major labels |
| Body/UI | Barlow | 400-600 | Body copy, controls, team names, help and errors |

Use tabular numerals for ranks, dates, times, set scores, records, and
standings statistics.

### Type scale

| Role | Phone | Desktop | Notes |
|---|---|---|---|
| Hero display | 52px / 0.9 | 88px / 0.9 | Short tournament statement only |
| Page title | 40px / 1 | 56px / 1 | One `h1` per page |
| Section title | 30px / 1.05 | 40px / 1.05 | `h2` |
| Component title | 22px / 1.15 | 28px / 1.15 | `h3` |
| Large body | 18px / 1.45 | 18px / 1.5 | Introductory copy |
| Body/UI | 16px / 1.5 | 16px / 1.5 | Default minimum |
| Supporting | 14px / 1.4 | 14px / 1.4 | Metadata and help |
| Utility label | 12px / 1.2 | 12px / 1.2 | Uppercase, short, tracked labels only |

### Type rules

- Use uppercase for the wordmark, short section labels, status labels, and
  major poster-like headings.
- Keep team names, venue names, messages, instructions, and form labels in
  natural title or sentence case.
- Do not use condensed display type for paragraphs.
- Do not use script, serif, stencil, or varsity fonts.
- Tight display tracking is allowed; body tracking remains normal.
- Never shrink critical information below 14px to make a layout fit.

## Identity

### Wordmark

The primary mark is a typographic `McGRAW OPEN` wordmark in Barlow Condensed
800, paired with a small court-line and tennis-ball device.

- Preserve the spelling and capitalization treatment.
- Keep the mark horizontal in the main header.
- A stacked treatment is allowed only in heroes and social images.
- Do not create a separate illustrated racket-and-ball logo.
- Do not place the wordmark inside a pill or generic app-logo tile.

### Signature court-line system

The signature element is a cropped service-box geometry with a Tennis Ball
marker.

- Use 1px or 2px court lines.
- Lines may frame a title, divide rounds, or connect bracket progression.
- The ball marker identifies one active route, current match, selected state,
  or primary action.
- Use no more than one emphasized ball marker in a component region.
- Keep linework out of form fields, table cells, and long text.
- Decorative linework is `aria-hidden`.
- On light surfaces, use Hardcourt Blue or Court Line.
- On dark surfaces, use Line White at full or controlled opacity.

The court-line device is the system's aesthetic risk. All other styling should
remain restrained.

## Spacing, shape, and depth

### Spacing scale

Use a 4px base:

`4, 8, 12, 16, 24, 32, 48, 64`

- Phone page gutter: 16px.
- Tablet page gutter: 24px.
- Desktop page gutter: 32px.
- Card padding: 16px on phones, 20px or 24px when space permits.
- Section gap: 32px on phones, 48px or 64px on desktop.
- Control gap: 8px or 12px.

### Shape

- Default radius: 6px.
- Small controls and badges: 4px.
- Large media frame maximum: 8px.
- Round only the ball marker, radio indicator, avatar-like player image, or
  progress spinner.
- Do not use 16px-24px floating dashboard cards or excessive pills.
- A clipped or angled edge is allowed only on a hero accent or current-match
  marker, never on every card.

### Borders and shadows

- Default border: 1px Court Line.
- Emphasized or selected border: 2px Hardcourt Blue.
- Inverse separator: 1px Line White at reduced opacity.
- Prefer borders and surface contrast over shadows.
- A single restrained shadow may lift a dialog or sticky action bar.
- Never use neon glow, glassmorphism, or stacked card shadows.

## Layout and responsive behavior

### Breakpoint intent

| Range | Intent |
|---|---|
| 320px-639px | Phone-first single-column layout |
| 640px-767px | Large phone/small tablet breathing room |
| 768px-1023px | Tablet grids and wider form panels |
| 1024px-1279px | Desktop header and multi-column content |
| 1280px+ | Preserve readable maximum width, not endless expansion |

The shared content maximum is 1180px.

### Page frame

```text
Phone
+--------------------------------+
| navy wordmark header           |
| court-line page title band     |
+--------------------------------+
| light content stack            |
|                                |
| safe bottom clearance          |
+--------------------------------+
| Home Groups Matches Bracket    |
+--------------------------------+

Desktop
+----------------------------------------------------------+
| wordmark                 Home Groups Matches Bracket     |
+----------------------------------------------------------+
| navy court-line title/hero band                          |
+----------------------------------------------------------+
| contained light content, max 1180px                      |
+----------------------------------------------------------+
```

### Layout rules

- The page itself never scrolls horizontally.
- A table may scroll inside a labeled container.
- Brackets never require page-level horizontal scrolling.
- Content grids follow information relationships, not decorative bento sizes.
- Long team and venue names wrap; do not truncate critical identity by default.
- Sticky elements must account for iOS safe areas and may not cover content.
- Reserve enough bottom padding for the phone navigation and any action bar.

## Navigation

### Phone

Use a sticky bottom navigation with four equal destinations:

1. Home
2. Groups
3. Matches
4. Bracket

Each destination has a consistent outline icon and visible text label. The
active destination uses the Tennis Ball marker plus a text/weight change. Do
not use color alone.

- Minimum target: 48px high and at least 44px wide.
- Include `env(safe-area-inset-bottom)`.
- Keep labels visible; no icon-only primary navigation.
- Maintain logical DOM and keyboard order.

### Tablet and desktop

Use a horizontal navigation in the top header. Active treatment reuses the
court-line and ball marker without shifting layout.

### Bracket release state

Before MGO-019 is released, keep the Bracket destination honest with a small
`Soon` label and a useful placeholder page. Do not present an empty live
bracket as finished.

### Keyboard support

Provide a visible skip link and visible focus:

- Hardcourt Blue focus ring on light surfaces;
- Tennis Ball focus ring on dark surfaces;
- 3px ring with clear offset;
- no focus treatment that depends only on a subtle color change.

## Icons

- Use one consistent 2px outline icon style.
- Prefer a small, established SVG icon package when icons materially improve
  recognition; do not draw unrelated icon styles ad hoc.
- Pair navigation, status, and destructive icons with text.
- Do not use emoji as interface icons.
- Decorative icons are hidden from assistive technology.
- Icon artwork never replaces semantic button text for critical actions.

## Component patterns

### Buttons

| Variant | Treatment | Use |
|---|---|---|
| Primary | Tennis Ball background, Center Court Navy text | One main action per region |
| Secondary | Hardcourt Blue background, Line White text | Standard confirm/edit action |
| Outline | White/Ice surface, Hardcourt Blue border and text | Alternate action |
| Quiet | Text or low-emphasis surface | Cancel, back, secondary navigation |
| Destructive | Danger background, Line White text | Clear, reopen, remove |

- Minimum height: 48px for primary form actions, 44px otherwise.
- Use active verbs: `Save schedule`, `Record result`, `Finalize groups`.
- Pending states retain the button width, disable repeated submission, and
  name the operation in progress.
- Hover and press feedback must not move surrounding layout.
- Destructive actions require a confirmation when data or locks change.

### Links

- Links are underlined in body copy.
- Navigation and card links may use structure, weight, and icon cues instead.
- External links identify that behavior when it is not obvious.

### Badges and state labels

Badges are compact rectangles with 4px radii, short text, and optional icons.
They do not become a field of decorative pills.

| State | Treatment |
|---|---|
| Unscheduled | Neutral outline plus `Unscheduled` |
| Scheduled | Hardcourt Blue plus calendar icon and `Scheduled` |
| Completed | Success plus check icon and `Completed` |
| Retirement | Warning plus `Retirement` |
| Walkover | Warning plus `Walkover` |
| Provisional | Warning plus `Provisional` |
| Live standings | Hardcourt Blue plus `Live` |
| Finalized | Center Court Navy plus lock icon and `Finalized` |
| Locked result | Center Court Navy outline plus lock icon and reason |
| Conflict/error | Danger plus explicit recovery instruction |

Do not animate the Live label.

### Group identity

- Group A uses an explicit `A` shield and solid court-line motif.
- Group B uses an explicit `B` shield and striped court-line motif.
- Both stay within the brand palette.
- Every use includes the group letter in text.

### Match summary

Build one semantic match-summary pattern and adapt its layout by breakpoint.

Information order:

1. Stage/group, stable match code, and status.
2. Team 1 and Team 2.
3. Winner and score/outcome when completed.
4. Scheduled or played Central Time and venue.
5. Organizer actions when authorized and allowed.

On phones it is a compact bordered card. On desktop it becomes a structured
row while retaining the same reading order.

- Winner uses weight plus a visible `Winner` cue; never color only.
- Missing knockout teams show their source placeholder, such as `A1` or
  `Winner QF1`.
- Optional data disappears cleanly without empty punctuation or labels.
- Locked matches explain why editing is unavailable.
- Organizer actions never displace the public match information.

### Score display

- Use Barlow Condensed 700 with tabular numerals.
- Align each set in a consistent score column.
- Identify a deciding match tiebreak with a visible `MTB` label and outlined
  score treatment; do not rely on color or unusually large numbers alone.
- Retirement and walkover labels sit beside the winner and outcome.
- Never display a fabricated score for a walkover.
- Partial retirement scores remain visibly partial and are not styled as a
  normal completed scoreline.

### Match filters

- Use labeled rectangular controls with 4px-6px radii.
- Separate group and stage into understandable filter groups.
- At 320px, controls wrap inside their region rather than overflowing the page.
- Selected filters use Hardcourt Blue fill, Line White text, and a non-color
  selected indicator.
- Filter state remains represented in the URL.
- Provide a clear reset when combinations return no matches.

### Standings tables

Use a semantic HTML table inside a labeled horizontal-scroll region.

- Keep rank and team columns sticky on phones.
- Keep headers visible and abbreviations explained.
- Use tabular numerals for P, W, L, set difference, and game difference.
- Use a left rail plus an `Advancing` label for the top four.
- Mark eliminated positions explicitly when elimination is meaningful.
- State `Provisional`, `Live`, `Finalized`, or `Unresolved tie` above the table.
- Explain the tiebreak order near the standings without crowding each row.
- Preserve logical table reading order for assistive technology.

### Forms

Unlock, scheduling, score entry, tie resolution, and bracket assignment use
dedicated focused pages on phones. On desktop, the same flow sits in a
contained panel no wider than 640px. Do not put complex forms in bottom sheets
or expand them inside dense match cards.

- Labels remain visible above fields.
- Text, date, time, select, and button controls are at least 48px high.
- Help text appears before errors; errors appear directly after the field.
- Required fields are identified in text, not only by an asterisk.
- Server validation preserves entered values.
- Winner, outcome, and deciding-set format choices use semantic native
  controls with large labels and targets.
- Score entry uses a clear set-by-set grid that remains usable at 320px.
- Destructive secondary actions are visually separated from the save action.
- On phones, a sticky action area may be used when it respects safe areas,
  does not cover fields, and retains a visible cancel/back path.

### Organizer mode

- Show a compact `Organizer mode` indicator when unlocked.
- Editing controls appear only where the action is relevant.
- The public page does not transform into a separate admin dashboard.
- Locked or unavailable actions remain understandable, with the reason shown.
- Lock-again is visible but does not compete with the page's primary task.

### Dialogs and confirmations

Dialogs are reserved for confirmation, not primary data entry.

- Use a clear title, consequence, and action-specific button.
- Put the safe action first in reading order.
- Destructive confirmation names what will be cleared, reopened, or locked.
- Trap focus correctly and restore it to the invoking control.
- Do not use browser `confirm()` for final product UI.

### Feedback and resilience

Every asynchronous or data-dependent surface supports:

| State | Pattern |
|---|---|
| Loading | Shape-matched skeleton without aggressive shimmer |
| Empty | Plain explanation plus the next useful action or destination |
| Pending mutation | Stable button label/width, disabled duplicate submit |
| Success | Inline confirmation near the changed content and polite live region |
| Validation failure | Field-level message preserving all valid input |
| Request failure | Clear reason when safe, retry action, preserved input |
| Conflict | Blocking Danger panel explaining newer data and requiring reload |
| Locked | Lock label, reason, and the allowed prerequisite action |

Do not turn errors into empty states. Do not rely on a disappearing toast as the
only confirmation or error.

## Page blueprints

### Home

- Open with the McGraw Open wordmark, tournament dates, and court-line thesis.
- Keep the primary phone viewport concise.
- Follow with next scheduled matches using the shared match summary.
- Show Group A and Group B leaders using the shared group identity.
- Link to complete Matches and Groups views.
- Handle no schedule and no completed results with directed empty states.
- Photography is optional; live tournament information remains primary.

### Groups

- Show tournament/group status before the tables.
- Present Group A and Group B as separate labeled sections.
- Reuse the locked standings table and group motifs.
- Keep finalization and reopening in an organizer action region, not mixed into
  public table rows.
- Manual exact-tie ordering uses explicit move up/down controls in addition to
  any pointer interaction, plus a required explanation field.
- Finalization presents a complete rank preview before confirmation.

### Matches

- Put page title and concise context before filters.
- Group sections in this order: scheduled, unscheduled, completed.
- Include a visible result count for the current filters.
- Reuse the match summary for every stage and state.
- Organizer edit actions lead to focused form pages.
- Zero results explain which filters are active and provide reset.

### Bracket

Phone layout:

```text
Quarterfinals
[QF1]
[QF2]
[QF3]
[QF4]

Semifinals
[SF1]
[SF2]

Final
[Final]
```

Desktop layout uses connected 4-2-1 columns. Match cards remain accessible DOM
content; connectors are decorative and hidden from assistive technology.

- Preserve round and source-match labels.
- Show placeholders before assignments.
- Reuse match status, schedule, venue, outcome, and score presentation.
- Never shrink a desktop bracket until its text becomes unreadable.
- Never require phone page-level horizontal scrolling.

### Unlock and organizer forms

- Keep the visual context tied to the match or tournament action.
- Use one task per focused page.
- Explain authorization failures generically without implying which PIN detail
  was wrong.
- Never display or preserve the raw PIN after unlock.

### Finalization and bracket assignment

- Show a read-only preview before the committing action.
- Use source-to-destination labels for quarterfinal, semifinal, and final
  assignments.
- Mark upstream locks with a lock icon, text reason, and downstream match.
- When a downstream assignment may be cleared, explain exactly which upstream
  result becomes editable.
- Scheduled or completed downstream matches show a non-actionable protected
  state rather than a misleading disabled control alone.

## Imagery

Photography may be used when real tournament photography is unavailable, but
only when:

- the stock license permits the intended web and social use;
- the source/license is recorded with the asset;
- the image is stored and optimized locally rather than hotlinked;
- the crop supports blue hardcourt, doubles play, racket, ball, or court detail;
- diverse, credible recreational play is preferred over celebrity imitation;
- text contrast is protected with a controlled overlay;
- meaningful images have useful alt text;
- decorative crops use empty alt text.

Avoid generic template compositions with fake dates, fake teams, fake venues,
or embedded text. The UI must remain complete if all photography is removed.

## Social and metadata imagery

The share image uses:

- the McGraw Open wordmark;
- 2026 tournament dates;
- Center Court Navy and Hardcourt Blue field;
- cropped white court geometry;
- one Tennis Ball marker;
- optional licensed action crop;
- no live score or hard-coded tournament state.

Favicon and small marks use the court-line/ball device, not tiny wordmark text.

## Motion

- Default interaction duration: 150ms-200ms.
- Animate opacity, color, or a small contained reveal only.
- Do not animate layout bounds on hover or press.
- Avoid parallax, scroll-jacking, bouncing status dots, and page-load
  choreography.
- At most one purposeful hero reveal may be introduced later.
- Under `prefers-reduced-motion: reduce`, remove nonessential transitions and
  all decorative movement.

## Accessibility and outdoor-use floor

- WCAG AA contrast is mandatory.
- Body text defaults to at least 16px.
- Primary touch controls are at least 44px; form actions target 48px.
- Keyboard order matches visual order.
- Focus is always visible.
- A skip link precedes repeated navigation.
- Heading levels remain sequential.
- Icons and color never carry critical meaning alone.
- Tables and bracket cards remain semantic DOM.
- Error text is associated with its field.
- Live regions announce mutation results without stealing focus.
- Safe areas are respected on current iOS Safari and Android Chrome.
- Test at 320px, 390px, tablet, and desktop widths.
- Test at 200% zoom and with reduced motion.

## Content voice

Write concise, direct, court-side language.

- Use sentence case for instructions and messages.
- Use active verbs for actions.
- Name tournament concepts as players understand them.
- Keep one term for each action across button, pending, success, and error
  states.
- Explain what happened and what to do next.
- Avoid hype, jokes in errors, vague `Something went wrong` messages, and
  implementation terms such as RPC, row, cookie payload, or revalidation.

Examples:

- `Save schedule`
- `Record result`
- `Clear result`
- `Finalize groups`
- `This match changed on another device. Reload before saving again.`
- `No scheduled matches yet. Check the unscheduled list for available fixtures.`

## Work-item coverage

| Work items | Design system coverage |
|---|---|
| MGO-006 | Identity, tokens, shell, navigation, route states, responsive frame |
| MGO-007-MGO-008 | Match summary, score display, grouping, filters, empty states |
| MGO-009-MGO-012 | Unlock, organizer mode, focused forms, outcomes, errors |
| MGO-013-MGO-016 | Standings, group states, finalization, home modules |
| MGO-017-MGO-018 | Loading, success, failure, conflict, accessibility, metadata |
| MGO-019-MGO-022 | Responsive bracket, assignment previews, locks, progression |

## Explicitly rejected directions

Do not introduce:

- generic bento-dashboard layouts;
- editorial serif or luxury-magazine typography;
- a full-dark treatment for dense data pages;
- warm cream and terracotta lifestyle styling;
- AI-style purple/pink gradients;
- neon glow, glassmorphism, or cyberpunk HUD styling;
- excessive pills, oversized radii, or floating card stacks;
- stock-template artwork or embedded fake tournament copy;
- decorative animation across routine UI;
- color-only group, result, advancement, or status meaning;
- a separate admin dashboard visual system;
- canvas-only standings or bracket rendering.

## Implementation guardrails

- Define primitive and semantic tokens as CSS custom properties.
- Expose those tokens through Tailwind rather than scattering arbitrary values.
- Use React Server Components by default.
- Keep client components limited to filters, forms, dialogs, pending states,
  and other real interactions.
- Use `next/font` and `next/image`.
- Prefer semantic HTML and native controls.
- Do not add a full component library.
- Reuse shared match, score, badge, form, feedback, and group patterns.
- Build states intentionally; do not leave loading, empty, error, locked, or
  conflict styling to each later work item.

## Change control

This direction is locked.

A later session may add a component-level rule when a documented work item
requires it, but must not change the palette, typography, signature device,
surface strategy, shape language, navigation model, or responsive bracket
model without explicit user approval.

Any approved foundational change must update this file first and explain:

1. the unmet product need;
2. the existing rule being changed;
3. the replacement rule;
4. affected routes and components;
5. accessibility and responsive impact.

When a local implementation choice conflicts with this file, this file wins
unless `SPEC.md` or `TECHNICAL_DECISIONS.md` requires otherwise.
