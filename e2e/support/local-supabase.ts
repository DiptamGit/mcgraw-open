import { execFileSync } from "node:child_process";

const LOCAL_DATABASE_CONTAINER = "supabase_db_macgraw-open-website";

const RESET_SQL = `-- Restores the seeded tournament fixtures between end-to-end runs without a
-- full \`supabase db reset\`. Only the local test database is ever touched.
begin;

update public.tournament_state
set
  group_stage_status = 'open',
  groups_finalized_at = null,
  tie_resolution_note = null
where id = 1;

update public.teams
set final_rank = null
where final_rank is not null;

update public.matches
set
  status = 'unscheduled',
  scheduled_at = null,
  venue = null,
  deciding_set_format = null,
  outcome_type = null,
  sets = null,
  winner_id = null,
  played_at = null,
  completed_at = null;

update public.matches
set
  team1_id = null,
  team2_id = null
where stage <> 'group';

delete from public.organizer_unlock_limits;
delete from public.audit_log;

commit;

select private.seed_2026_tournament();
`;

export type LocalSupabaseEnvironment = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

function readStatusEnvironment(): Map<string, string> {
  const output = execFileSync(
    "npx",
    ["--yes", "supabase", "status", "-o", "env"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

  const values = new Map<string, string>();
  for (const line of output.split("\n")) {
    const match = /^([A-Z0-9_]+)="(.*)"$/.exec(line.trim());
    if (match) {
      values.set(match[1], match[2]);
    }
  }

  return values;
}

/**
 * Reads credentials from the isolated local Supabase stack. End-to-end tests
 * never run against the shared staging project or production.
 */
export function getLocalSupabaseEnvironment(): LocalSupabaseEnvironment {
  const values = readStatusEnvironment();
  const url = values.get("API_URL");
  const anonKey = values.get("ANON_KEY");
  const serviceRoleKey = values.get("SERVICE_ROLE_KEY");

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Local Supabase is not running. Start it with `npx supabase start` before running the end-to-end suite.",
    );
  }

  if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
    throw new Error(
      `Refusing to run end-to-end tests against a non-local Supabase URL: ${url}`,
    );
  }

  return {
    SUPABASE_URL: url,
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };
}

/** Restores the seeded fixtures so every run starts from known data. */
export function resetLocalSupabaseDatabase(): void {
  executeLocalSql(RESET_SQL);
}

/** Runs fixture SQL only against this repository's local Supabase container. */
export function executeLocalSql(sql: string): void {
  runLocalSql(sql);
}

/** Returns a scalar or unaligned query result from the local test database. */
export function queryLocalSql(sql: string): string {
  return runLocalSql(sql).trim();
}

function runLocalSql(sql: string): string {
  const databaseUrl = readStatusEnvironment().get("DB_URL");

  if (!databaseUrl) {
    throw new Error(
      "Local Supabase is not running. Start it with `npx supabase start` before running the end-to-end suite.",
    );
  }

  if (!databaseUrl.includes("127.0.0.1") && !databaseUrl.includes("localhost")) {
    throw new Error(
      "Refusing to reset a database that is not the local Supabase instance.",
    );
  }

  assertLocalDatabaseContainer();
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      LOCAL_DATABASE_CONTAINER,
      "psql",
      "--username=postgres",
      "--dbname=postgres",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--variable=ON_ERROR_STOP=1",
    ],
    { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] },
  );
}

function assertLocalDatabaseContainer(): void {
  let running: string;

  try {
    running = execFileSync(
      "docker",
      [
        "inspect",
        "--format",
        "{{.State.Running}}",
        LOCAL_DATABASE_CONTAINER,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
  } catch {
    throw new Error(
      `The ${LOCAL_DATABASE_CONTAINER} container is not running. Start this repository's stack with \`npx supabase start\`.`,
    );
  }

  if (running !== "true") {
    throw new Error(
      `The ${LOCAL_DATABASE_CONTAINER} container is not running. Start this repository's stack with \`npx supabase start\`.`,
    );
  }
}
