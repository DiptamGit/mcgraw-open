import "server-only";

import { revalidatePath } from "next/cache";

export const TOURNAMENT_DATA_ROUTES = [
  "/",
  "/groups",
  "/matches",
  "/bracket",
] as const;

export function revalidateTournamentData(): void {
  for (const route of TOURNAMENT_DATA_ROUTES) {
    revalidatePath(route, "page");
  }
}
