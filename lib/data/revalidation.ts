import "server-only";

import { revalidatePath } from "next/cache";

export const TOURNAMENT_DATA_ROUTES = [
  "/",
  "/groups",
  "/groups/finalize",
  "/groups/reopen",
  "/matches",
  "/bracket",
] as const;

export function revalidateTournamentData(matchCode?: string): void {
  for (const route of TOURNAMENT_DATA_ROUTES) {
    revalidatePath(route, "page");
  }

  if (matchCode) {
    revalidatePath(
      `/matches/${encodeURIComponent(matchCode)}/result`,
      "page",
    );
  }
}
