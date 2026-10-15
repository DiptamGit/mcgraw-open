import { DataIntegrityError } from "./data/errors";
import type { MatchRecord } from "./data/schema";
import { validateNormalScore } from "./matches/result";

export type QuarterfinalSeed = {
  seed: number;
  teamId: string;
  sourceCode: string;
  setsWon: number;
  setsPlayed: number;
  gamesWon: number;
  gamesPlayed: number;
};

export function seedQuarterfinalWinners(
  matches: readonly MatchRecord[],
  eligibleTeamIds: readonly string[],
): QuarterfinalSeed[] {
  const quarterfinals = matches.filter((match) => match.stage === "quarterfinal");
  if (
    quarterfinals.length !== 4 ||
    new Set(quarterfinals.map((match) => match.code)).size !== 4
  ) {
    throw new DataIntegrityError("Seeding requires exactly four quarterfinals.");
  }

  const seeds = quarterfinals.map<QuarterfinalSeed>((match) => {
    if (
      !["QF1", "QF2", "QF3", "QF4"].includes(match.code) ||
      match.status !== "completed" ||
      match.outcome_type !== "normal" ||
      match.deciding_set_format !== "full_set" ||
      !match.team1_id ||
      !match.team2_id ||
      match.team1_id === match.team2_id ||
      !match.winner_id ||
      !eligibleTeamIds.includes(match.winner_id) ||
      !match.sets ||
      (match.winner_id !== match.team1_id && match.winner_id !== match.team2_id)
    ) {
      throw new DataIntegrityError(`Quarterfinal ${match.code} cannot be seeded.`);
    }
    const winnerSide = match.winner_id === match.team1_id ? "team1" : "team2";
    const validation = validateNormalScore({
      sets: match.sets,
      decidingSetFormat: "full_set",
      winnerSide,
    });
    if (!validation.success) {
      throw new DataIntegrityError(`Quarterfinal ${match.code} has invalid scores.`);
    }
    const winnerScores = match.sets.map(([first, second]) =>
      winnerSide === "team1" ? [first, second] : [second, first],
    );
    return {
      seed: 0,
      teamId: match.winner_id,
      sourceCode: match.code,
      setsWon: winnerScores.filter(([won, lost]) => won > lost).length,
      setsPlayed: winnerScores.length,
      gamesWon: winnerScores.reduce((sum, [won]) => sum + won, 0),
      gamesPlayed: winnerScores.reduce((sum, [won, lost]) => sum + won + lost, 0),
    };
  });

  if (new Set(seeds.map((seed) => seed.teamId)).size !== 4) {
    throw new DataIntegrityError("Quarterfinal winners must be four distinct teams.");
  }

  const compare = (left: QuarterfinalSeed, right: QuarterfinalSeed): number =>
    right.setsWon * left.setsPlayed - left.setsWon * right.setsPlayed ||
    right.gamesWon * left.gamesPlayed - left.gamesWon * right.gamesPlayed;
  seeds.sort(compare);
  if (seeds.some((seed, index) => index > 0 && compare(seeds[index - 1], seed) === 0)) {
    throw new DataIntegrityError("Exact semifinal seeding tie requires an organizer ruling.");
  }
  return seeds.map((seed, index) => ({ ...seed, seed: index + 1 }));
}
