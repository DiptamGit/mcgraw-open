import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import {
  createPublicSupabaseClient,
  type TournamentSupabaseClient,
} from "../supabase/clients";
import { DataLayerError } from "./errors";
import {
  normalizeMatches,
  parseMatchRecords,
  parseTeams,
  parseTournamentState,
  type MatchRecord,
  type Team,
  type TournamentMatch,
  type TournamentState,
} from "./schema";

export type TournamentData = {
  teams: Team[];
  matches: TournamentMatch[];
  state: TournamentState;
};

function throwQueryError(description: string, error: PostgrestError): never {
  throw new DataLayerError(`Could not load ${description} from Supabase.`, {
    cause: error,
  });
}

async function loadTeams(
  client: TournamentSupabaseClient,
): Promise<Team[]> {
  const { data, error } = await client
    .from("teams")
    .select("*")
    .order("group_label")
    .order("name");

  if (error) {
    throwQueryError("teams", error);
  }

  return parseTeams(data);
}

async function loadMatchRecords(
  client: TournamentSupabaseClient,
): Promise<MatchRecord[]> {
  const { data, error } = await client
    .from("matches")
    .select("*")
    .order("code");

  if (error) {
    throwQueryError("matches", error);
  }

  return parseMatchRecords(data);
}

async function loadTournamentState(
  client: TournamentSupabaseClient,
): Promise<TournamentState> {
  const { data, error } = await client
    .from("tournament_state")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throwQueryError("tournament state", error);
  }

  return parseTournamentState(data);
}

export async function getTeams(): Promise<Team[]> {
  return loadTeams(createPublicSupabaseClient());
}

export async function getMatches(): Promise<TournamentMatch[]> {
  const client = createPublicSupabaseClient();
  const [teams, matchRecords] = await Promise.all([
    loadTeams(client),
    loadMatchRecords(client),
  ]);

  return normalizeMatches(matchRecords, teams);
}

export async function getMatchByCode(
  code: string,
): Promise<TournamentMatch | null> {
  const matches = await getMatches();
  return matches.find((match) => match.code === code) ?? null;
}

export async function getMatchRecordById(
  id: string,
): Promise<MatchRecord | null> {
  const client = createPublicSupabaseClient();
  const { data, error } = await client
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throwQueryError("match", error);
  }

  return data ? parseMatchRecords([data])[0] ?? null : null;
}

export async function getTournamentState(): Promise<TournamentState> {
  return loadTournamentState(createPublicSupabaseClient());
}

export async function getTournamentData(): Promise<TournamentData> {
  const client = createPublicSupabaseClient();
  const [teams, matchRecords, state] = await Promise.all([
    loadTeams(client),
    loadMatchRecords(client),
    loadTournamentState(client),
  ]);

  return {
    teams,
    matches: normalizeMatches(matchRecords, teams),
    state,
  };
}
