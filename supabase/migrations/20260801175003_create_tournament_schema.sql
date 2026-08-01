create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_label text not null,
  final_rank integer,
  constraint teams_name_not_blank check (btrim(name) <> ''),
  constraint teams_group_label_valid check (group_label in ('A', 'B')),
  constraint teams_final_rank_valid check (
    final_rank is null
    or (
      group_label = 'A'
      and final_rank between 1 and 5
    )
    or (
      group_label = 'B'
      and final_rank between 1 and 6
    )
  ),
  constraint teams_group_final_rank_unique unique (group_label, final_rank),
  constraint teams_id_group_unique unique (id, group_label)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  stage text not null,
  group_label text,
  label text,
  team1_id uuid references public.teams (id),
  team2_id uuid references public.teams (id),
  status text not null default 'unscheduled',
  scheduled_at timestamptz,
  venue text,
  deciding_set_format text,
  outcome_type text,
  sets jsonb,
  winner_id uuid references public.teams (id),
  played_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint matches_code_not_blank check (btrim(code) <> ''),
  constraint matches_label_not_blank check (label is null or btrim(label) <> ''),
  constraint matches_venue_not_blank check (venue is null or btrim(venue) <> ''),
  constraint matches_stage_valid check (
    stage in ('group', 'quarterfinal', 'semifinal', 'final')
  ),
  constraint matches_group_label_valid check (
    group_label is null or group_label in ('A', 'B')
  ),
  constraint matches_status_valid check (
    status in ('unscheduled', 'scheduled', 'completed')
  ),
  constraint matches_deciding_set_format_valid check (
    deciding_set_format is null
    or deciding_set_format in ('full_set', 'match_tiebreak')
  ),
  constraint matches_outcome_type_valid check (
    outcome_type is null
    or outcome_type in ('normal', 'retirement', 'walkover')
  ),
  constraint matches_distinct_teams check (
    team1_id is null or team2_id is null or team1_id <> team2_id
  ),
  constraint matches_winner_is_participant check (
    winner_id is null or winner_id = team1_id or winner_id = team2_id
  ),
  constraint matches_stage_group_consistency check (
    (
      stage = 'group'
      and group_label is not null
      and team1_id is not null
      and team2_id is not null
    )
    or (
      stage <> 'group'
      and group_label is null
    )
  ),
  constraint matches_team1_group_consistency foreign key (team1_id, group_label)
    references public.teams (id, group_label),
  constraint matches_team2_group_consistency foreign key (team2_id, group_label)
    references public.teams (id, group_label),
  constraint matches_schedule_consistency check (
    (
      status = 'unscheduled'
      and scheduled_at is null
      and venue is null
    )
    or (
      status = 'scheduled'
      and scheduled_at is not null
    )
    or status = 'completed'
  ),
  constraint matches_venue_requires_schedule check (
    scheduled_at is not null or venue is null
  ),
  constraint matches_active_teams_required check (
    status = 'unscheduled'
    or (team1_id is not null and team2_id is not null)
  ),
  constraint matches_sets_is_array check (
    sets is null or jsonb_typeof(sets) = 'array'
  ),
  constraint matches_result_consistency check (
    (
      status <> 'completed'
      and deciding_set_format is null
      and outcome_type is null
      and sets is null
      and winner_id is null
      and played_at is null
      and completed_at is null
    )
    or (
      status = 'completed'
      and winner_id is not null
      and outcome_type is not null
      and played_at is not null
      and completed_at is not null
      and completed_at >= played_at
      and (
        (
          outcome_type = 'normal'
          and deciding_set_format is not null
          and case
            when jsonb_typeof(sets) = 'array'
              then jsonb_array_length(sets) between 2 and 3
            else false
          end
        )
        or (
          outcome_type = 'retirement'
          and deciding_set_format is not null
          and (
            sets is null
            or case
              when jsonb_typeof(sets) = 'array'
                then jsonb_array_length(sets) between 1 and 3
              else false
            end
          )
        )
        or (
          outcome_type = 'walkover'
          and deciding_set_format is null
          and sets is null
        )
      )
    )
  )
);

create unique index matches_unique_group_pair
  on public.matches (
    least(team1_id, team2_id),
    greatest(team1_id, team2_id)
  )
  where stage = 'group';

create index matches_status_schedule_idx
  on public.matches (status, scheduled_at)
  where status = 'scheduled';

create index matches_status_played_idx
  on public.matches (status, played_at desc)
  where status = 'completed';

create index matches_stage_group_status_idx
  on public.matches (stage, group_label, status);

create table public.tournament_state (
  id smallint primary key default 1,
  group_stage_status text not null default 'open',
  groups_finalized_at timestamptz,
  tie_resolution_note text,
  updated_at timestamptz not null default statement_timestamp(),
  constraint tournament_state_singleton check (id = 1),
  constraint tournament_state_status_valid check (
    group_stage_status in ('open', 'finalized')
  ),
  constraint tournament_state_tie_note_not_blank check (
    tie_resolution_note is null or btrim(tie_resolution_note) <> ''
  ),
  constraint tournament_state_finalization_consistency check (
    (
      group_stage_status = 'open'
      and groups_finalized_at is null
      and tie_resolution_note is null
    )
    or (
      group_stage_status = 'finalized'
      and groups_finalized_at is not null
    )
  )
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  action text not null,
  entity_type text not null,
  entity_key text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint audit_log_action_valid check (
    action in ('insert', 'update', 'delete')
  ),
  constraint audit_log_entity_type_not_blank check (btrim(entity_type) <> ''),
  constraint audit_log_entity_key_not_blank check (btrim(entity_key) <> ''),
  constraint audit_log_payload_consistency check (
    (
      action = 'insert'
      and before_data is null
      and after_data is not null
    )
    or (
      action = 'update'
      and before_data is not null
      and after_data is not null
    )
    or (
      action = 'delete'
      and before_data is not null
      and after_data is null
    )
  )
);

create index audit_log_entity_created_idx
  on public.audit_log (entity_type, entity_key, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  changed_row jsonb;
  record_key text;
begin
  changed_row := case
    when tg_op = 'DELETE' then to_jsonb(old)
    else to_jsonb(new)
  end;

  record_key := case
    when tg_table_name = 'matches' then changed_row ->> 'code'
    else changed_row ->> 'id'
  end;

  insert into public.audit_log (
    action,
    entity_type,
    entity_key,
    before_data,
    after_data
  )
  values (
    lower(tg_op),
    tg_table_name,
    record_key,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger tournament_state_set_updated_at
before update on public.tournament_state
for each row execute function public.set_updated_at();

create trigger teams_write_audit_log
after insert or update or delete on public.teams
for each row execute function public.write_audit_log();

create trigger matches_write_audit_log
after insert or update or delete on public.matches
for each row execute function public.write_audit_log();

create trigger tournament_state_write_audit_log
after insert or update or delete on public.tournament_state
for each row execute function public.write_audit_log();

alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.tournament_state enable row level security;
alter table public.audit_log enable row level security;

create policy "Public can read teams"
on public.teams
for select
to anon, authenticated
using (true);

create policy "Public can read matches"
on public.matches
for select
to anon, authenticated
using (true);

create policy "Public can read tournament state"
on public.tournament_state
for select
to anon, authenticated
using (true);

revoke all on table public.teams from public, anon, authenticated;
revoke all on table public.matches from public, anon, authenticated;
revoke all on table public.tournament_state from public, anon, authenticated;
revoke all on table public.audit_log from public, anon, authenticated;
revoke all on sequence public.audit_log_id_seq from public, anon, authenticated;

grant select on table public.teams to anon, authenticated;
grant select on table public.matches to anon, authenticated;
grant select on table public.tournament_state to anon, authenticated;

grant select, insert, update, delete on table public.teams to service_role;
grant select, insert, update, delete on table public.matches to service_role;
grant select, insert, update, delete on table public.tournament_state
  to service_role;
grant select on table public.audit_log to service_role;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.write_audit_log()
  from public, anon, authenticated;

insert into public.tournament_state (id) values (1);