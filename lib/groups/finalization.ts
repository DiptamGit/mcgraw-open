import { z } from "zod";

import { DataIntegrityError } from "@/lib/data/errors";
import type { TournamentData } from "@/lib/data/queries";
import type { Team } from "@/lib/data/schema";
import {
  calculateGroupStandings,
  type GroupStandings,
} from "@/lib/standings/calculate";

const timestampSchema = z.iso.datetime({ offset: true });

export const expectedGroupMatchVersionsSchema = z.array(
  z.object({
    match_id: z.uuid(),
    updated_at: timestampSchema,
  }),
);

export const manualTieOrdersSchema = z.record(
  z.string().min(1),
  z.array(z.uuid()),
);

export type ManualTieOrders = z.infer<typeof manualTieOrdersSchema>;

export type FinalizationPreviewRow = {
  teamId: string;
  teamName: string;
  automaticRank: number;
  tieKey: string | null;
};

export type FinalizationTie = {
  key: string;
  groupLabel: Team["group_label"];
  rank: number;
  teamIds: string[];
};

export type FinalizationPreviewGroup = {
  groupLabel: Team["group_label"];
  rows: FinalizationPreviewRow[];
};

export type FinalizationPreview = {
  groups: FinalizationPreviewGroup[];
  ties: FinalizationTie[];
  completedMatches: number;
  totalMatches: number;
  allMatchesComplete: boolean;
  expectedMatchVersions: z.infer<
    typeof expectedGroupMatchVersionsSchema
  >;
};

export type FinalizationFormState = {
  status: "idle" | "error" | "conflict";
  message: string | null;
  fieldErrors: {
    manualOrders?: string;
    tieResolutionNote?: string;
  };
  values: {
    manualOrders: ManualTieOrders;
    tieResolutionNote: string;
  };
};

export type FinalRankingSnapshot = {
  team_id: string;
  final_rank: number;
};

export type FinalRankingResolution =
  | {
      success: true;
      rankings: FinalRankingSnapshot[];
      tieResolutionNote: string | null;
    }
  | {
      success: false;
      message: string;
      fieldErrors: FinalizationFormState["fieldErrors"];
    };

function tieKey(
  groupLabel: Team["group_label"],
  rank: number,
  teamIds: string[],
): string {
  return `${groupLabel}-${rank}-${[...teamIds].sort().join("-")}`;
}

function previewGroup(standings: GroupStandings): {
  group: FinalizationPreviewGroup;
  ties: FinalizationTie[];
} {
  const ties = standings.unresolvedTies.map((tie) => ({
    key: tieKey(standings.groupLabel, tie.rank, tie.teamIds),
    groupLabel: standings.groupLabel,
    rank: tie.rank,
    teamIds: tie.teamIds,
  }));
  const tieKeyByTeam = new Map<string, string>();

  for (const tie of ties) {
    for (const teamId of tie.teamIds) {
      if (tieKeyByTeam.has(teamId)) {
        throw new DataIntegrityError(
          `Group ${standings.groupLabel} has overlapping unresolved ties.`,
        );
      }
      tieKeyByTeam.set(teamId, tie.key);
    }
  }

  return {
    group: {
      groupLabel: standings.groupLabel,
      rows: standings.rows.map((row) => ({
        teamId: row.team.id,
        teamName: row.team.name,
        automaticRank: row.rank,
        tieKey: tieKeyByTeam.get(row.team.id) ?? null,
      })),
    },
    ties,
  };
}

export function createFinalizationPreview(
  tournament: TournamentData,
): FinalizationPreview {
  const standings = (["A", "B"] as const).map((groupLabel) =>
    calculateGroupStandings(
      tournament.teams,
      tournament.matches,
      groupLabel,
    ),
  );
  const previewGroups = standings.map(previewGroup);
  const groupMatches = tournament.matches.filter(
    (match) => match.stage === "group",
  );
  const completedMatches = groupMatches.filter(
    (match) => match.status === "completed",
  ).length;

  return {
    groups: previewGroups.map(({ group }) => group),
    ties: previewGroups.flatMap(({ ties }) => ties),
    completedMatches,
    totalMatches: groupMatches.length,
    allMatchesComplete: completedMatches === groupMatches.length,
    expectedMatchVersions: groupMatches
      .map((match) => ({
        match_id: match.id,
        updated_at: match.updated_at,
      }))
      .sort((left, right) => left.match_id.localeCompare(right.match_id)),
  };
}

export function createFinalizationFormState(
  preview: FinalizationPreview,
): FinalizationFormState {
  return {
    status: "idle",
    message: null,
    fieldErrors: {},
    values: {
      manualOrders: Object.fromEntries(
        preview.ties.map((tie) => [tie.key, tie.teamIds]),
      ),
      tieResolutionNote: "",
    },
  };
}

function sameTeamSet(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((teamId) => right.includes(teamId))
  );
}

export function resolveFinalRankings(
  preview: FinalizationPreview,
  manualOrders: ManualTieOrders,
  note: string,
): FinalRankingResolution {
  const expectedTieKeys = new Set(preview.ties.map((tie) => tie.key));
  const submittedTieKeys = Object.keys(manualOrders);

  if (
    submittedTieKeys.length !== expectedTieKeys.size ||
    submittedTieKeys.some((key) => !expectedTieKeys.has(key))
  ) {
    return {
      success: false,
      message: "The tie order changed. Reload the standings before finalizing.",
      fieldErrors: {
        manualOrders: "Reload and review the current tied teams.",
      },
    };
  }

  for (const tie of preview.ties) {
    const submittedOrder = manualOrders[tie.key];
    if (!submittedOrder || !sameTeamSet(submittedOrder, tie.teamIds)) {
      return {
        success: false,
        message:
          "Each tied team must appear exactly once in its final order.",
        fieldErrors: {
          manualOrders: "Review every tied-team order.",
        },
      };
    }
  }

  const normalizedNote = note.trim();
  if (preview.ties.length > 0 && normalizedNote.length === 0) {
    return {
      success: false,
      message: "Explain how the remaining tie was resolved.",
      fieldErrors: {
        tieResolutionNote:
          "Add the reason used to choose the final tied-team order.",
      },
    };
  }

  if (preview.ties.length === 0 && normalizedNote.length > 0) {
    return {
      success: false,
      message:
        "The current standings have no unresolved tie requiring a note.",
      fieldErrors: {
        tieResolutionNote: "Remove the tie-resolution note and try again.",
      },
    };
  }

  const tieByKey = new Map(preview.ties.map((tie) => [tie.key, tie]));
  const processedTies = new Set<string>();
  const rankings: FinalRankingSnapshot[] = [];

  for (const group of preview.groups) {
    for (const row of group.rows) {
      if (!row.tieKey) {
        rankings.push({
          team_id: row.teamId,
          final_rank: row.automaticRank,
        });
        continue;
      }

      if (processedTies.has(row.tieKey)) {
        continue;
      }

      const tie = tieByKey.get(row.tieKey);
      const order = manualOrders[row.tieKey];
      if (!tie || !order) {
        throw new DataIntegrityError(
          "The finalization preview is missing an unresolved tie.",
        );
      }

      order.forEach((teamId, index) => {
        rankings.push({
          team_id: teamId,
          final_rank: tie.rank + index,
        });
      });
      processedTies.add(row.tieKey);
    }
  }

  for (const group of preview.groups) {
    const groupTeamIds = new Set(group.rows.map((row) => row.teamId));
    const groupRanks = rankings
      .filter((ranking) => groupTeamIds.has(ranking.team_id))
      .map((ranking) => ranking.final_rank)
      .sort((left, right) => left - right);
    const expectedRanks = group.rows.map((_, index) => index + 1);

    if (
      groupRanks.length !== expectedRanks.length ||
      groupRanks.some((rank, index) => rank !== expectedRanks[index])
    ) {
      throw new DataIntegrityError(
        `Group ${group.groupLabel} final ranks are incomplete.`,
      );
    }
  }

  return {
    success: true,
    rankings,
    tieResolutionNote:
      preview.ties.length > 0 ? normalizedNote : null,
  };
}
