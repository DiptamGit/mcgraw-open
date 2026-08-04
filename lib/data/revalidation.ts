import "server-only";

import { revalidatePath } from "next/cache";

export const TOURNAMENT_DATA_ROUTES = [
  "/",
  "/groups",
  "/groups/finalize",
  "/groups/reopen",
  "/matches",
  "/matches/[code]/schedule",
  "/matches/[code]/result",
  "/bracket",
] as const;

export function revalidateTournamentData(matchCode?: string): void {
  for (const route of TOURNAMENT_DATA_ROUTES) {
    revalidatePath(route, "page");
  }

  if (matchCode) {
    const encodedCode = encodeURIComponent(matchCode);
    revalidatePath(`/matches/${encodedCode}/result`, "page");
    revalidatePath(`/matches/${encodedCode}/schedule`, "page");
  }
}
