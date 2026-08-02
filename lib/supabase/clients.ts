import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import {
  getPrivilegedSupabaseEnvironment,
  getPublicSupabaseEnvironment,
} from "./environment";

export type TournamentSupabaseClient = SupabaseClient<Database>;

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    cache: "no-store",
  });

export function createPublicSupabaseClient(): TournamentSupabaseClient {
  const environment = getPublicSupabaseEnvironment();

  return createClient<Database>(
    environment.SUPABASE_URL,
    environment.SUPABASE_ANON_KEY,
    {
      auth: authOptions,
      global: { fetch: noStoreFetch },
    },
  );
}

export function createPrivilegedSupabaseClient(): TournamentSupabaseClient {
  const environment = getPrivilegedSupabaseEnvironment();

  return createClient<Database>(
    environment.SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: authOptions,
      global: { fetch: noStoreFetch },
    },
  );
}
