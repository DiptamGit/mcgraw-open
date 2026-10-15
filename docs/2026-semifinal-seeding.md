# 2026 semifinal seeding

The organizer approved quarterfinal-only performance seeding instead of the
previously published lottery. Rank by sets won / sets played first, then games
won / total games played. Compare exact fractions; the percentages below are
rounded only for display. An exact tie requires an organizer ruling.

| Seed | Team / players | QF sets W-L | Set-win % | QF games W-L | Game-win % |
|---|---|---|---|---|---|
| 1 | Drop Shot Society - Giri / Srini | 2-0 | 100.00% | 12-5 | 70.59% |
| 2 | Net Results - Ranjit / Venu C | 2-0 | 100.00% | 13-7 | 65.00% |
| 3 | Baseline Bandits - Prasad V / Srinivas | 2-0 | 100.00% | 14-12 | 53.85% |
| 4 | Court Jesters - Amit Gupta / Jeet | 2-1 | 66.67% | 16-10 | 61.54% |

**SF1:** Giri / Srini vs Amit Gupta / Jeet (1 vs 4; QF4 vs QF1 winners).
**SF2:** Ranjit / Venu C vs Prasad V / Srinivas (2 vs 3; QF3 vs QF2 winners).

The three straight-set winners lead Court Jesters on the primary set metric.
Game-win percentage separates those three; it does not override the set metric.
Using only QFs gives each semifinalist one played match and avoids mixing in
unequal group histories, withdrawals, and walkovers. These are fixed approved
2026 pairings, not automatic future reseeding.

## Recorded evidence and administrative qualifications

- QF1: Court Jesters beat Fault Tolerant 4-6, 6-2, 6-2.
- QF2: Baseline Bandits beat Deuce Detectives 7-6 (7-1), 7-6 (7-4).
- QF3: Net Results beat Spin Doctors 6-1, 7-6 (7-4).
- QF4: Drop Shot Society beat Lob Stars 6-3, 6-2.
- QF1-QF3 were played October 13, 2026 at 6 PM Central; QF4 October 14 at
  5 PM Central. All were at BHS. The confirmed start times also backfill the
  schedule field to retain the venue under the existing database constraint.
- Court Jesters played a full third set. `full_set` for the other matches is
  an organizer-approved administrative value for an unused deciding set.
- Tiebreak points remain in the reconciliation evidence, not new score fields.
  A 7-6 set contributes seven games to six, not the tiebreak's point totals.
  Total rally points are unknown and are not used.
- Rally Rascals and Racquet Scientists are withdrawn. All 30 completed group
  matches and historical wins are preserved; no unplayed production group
  fixtures remained to receive walkovers.
- The organizer explicitly supplied the official final group order, including
  Baseline Bandits B3 and Court Jesters B4, as an eligibility/order ruling rather
  than the existing automatic tiebreak calculation. The ruling is audited
  separately from automatic ties; the general standings rules are unchanged.

Applied to staging and production through the reviewed, organizer-authorized
MGO-033 reconciliation. All 30 historical production group rows and the Final
were preserved. Release details are tracked in `WORK_ITEMS.md`.
