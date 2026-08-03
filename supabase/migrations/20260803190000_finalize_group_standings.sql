create or replace function public.prevent_finalized_group_result_changes()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  current_group_status text;
begin
  if old.stage = 'group'
    and (
      new.status is distinct from old.status
      or new.deciding_set_format is distinct from old.deciding_set_format
      or new.outcome_type is distinct from old.outcome_type
      or new.sets is distinct from old.sets
      or new.winner_id is distinct from old.winner_id
      or new.played_at is distinct from old.played_at
      or new.completed_at is distinct from old.completed_at
    )
  then
    select group_stage_status
    into current_group_status
    from public.tournament_state
    where id = 1;

    if current_group_status = 'finalized' then
      raise exception using
        errcode = 'P0001',
        message = 'GROUP_RESULTS_FINALIZED';
    end if;
  end if;

  return new;
end;
$$;

create trigger matches_prevent_finalized_group_result_changes
before update on public.matches
for each row execute function public.prevent_finalized_group_result_changes();

create or replace function public.finalize_group_standings(
  p_expected_state_updated_at timestamptz,
  p_match_versions jsonb,
  p_rankings jsonb,
  p_tie_resolution_note text
)
returns public.tournament_state
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_state public.tournament_state%rowtype;
  finalized_state public.tournament_state%rowtype;
  normalized_note text;
  normalized_rankings jsonb;
  group_match_count integer;
  team_count integer;
  before_snapshot jsonb;
begin
  if jsonb_typeof(p_match_versions) is distinct from 'array' then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_GROUP_MATCH_VERSIONS';
  end if;

  if jsonb_typeof(p_rankings) is distinct from 'array' then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_GROUP_RANKINGS';
  end if;

  select *
  into current_state
  from public.tournament_state
  where id = 1
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'TOURNAMENT_STATE_MISSING';
  end if;

  if current_state.group_stage_status <> 'open' then
    raise exception using
      errcode = 'P0001',
      message = 'GROUPS_ALREADY_FINALIZED';
  end if;

  if current_state.updated_at is distinct from p_expected_state_updated_at then
    raise exception using
      errcode = 'P0001',
      message = 'GROUP_STATE_CONFLICT';
  end if;

  perform id
  from public.matches
  where stage = 'group'
  order by id
  for update;

  select count(*)
  into group_match_count
  from public.matches
  where stage = 'group';

  if exists (
    select 1
    from public.matches
    where stage = 'group'
      and status <> 'completed'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'GROUP_MATCHES_INCOMPLETE';
  end if;

  if jsonb_array_length(p_match_versions) <> group_match_count
    or exists (
      select 1
      from jsonb_to_recordset(p_match_versions)
        as version(match_id uuid, updated_at timestamptz)
      where version.match_id is null
        or version.updated_at is null
    )
    or exists (
      select 1
      from jsonb_to_recordset(p_match_versions)
        as version(match_id uuid, updated_at timestamptz)
      group by version.match_id
      having count(*) <> 1
    )
    or exists (
      select 1
      from public.matches as match
      left join jsonb_to_recordset(p_match_versions)
        as version(match_id uuid, updated_at timestamptz)
        on version.match_id = match.id
      where match.stage = 'group'
        and (
          version.match_id is null
          or version.updated_at is distinct from match.updated_at
        )
    )
    or exists (
      select 1
      from jsonb_to_recordset(p_match_versions)
        as version(match_id uuid, updated_at timestamptz)
      left join public.matches as match
        on match.id = version.match_id
        and match.stage = 'group'
      where match.id is null
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'GROUP_MATCH_CONFLICT';
  end if;

  select count(*)
  into team_count
  from public.teams;

  if jsonb_array_length(p_rankings) <> team_count
    or exists (
      select 1
      from jsonb_to_recordset(p_rankings)
        as ranking(team_id uuid, final_rank integer)
      where ranking.team_id is null
        or ranking.final_rank is null
    )
    or exists (
      select 1
      from jsonb_to_recordset(p_rankings)
        as ranking(team_id uuid, final_rank integer)
      group by ranking.team_id
      having count(*) <> 1
    )
    or exists (
      select 1
      from public.teams as team
      left join jsonb_to_recordset(p_rankings)
        as ranking(team_id uuid, final_rank integer)
        on ranking.team_id = team.id
      where ranking.team_id is null
    )
    or exists (
      select 1
      from jsonb_to_recordset(p_rankings)
        as ranking(team_id uuid, final_rank integer)
      left join public.teams as team on team.id = ranking.team_id
      where team.id is null
    )
    or exists (
      select 1
      from jsonb_to_recordset(p_rankings)
        as ranking(team_id uuid, final_rank integer)
      join public.teams as team on team.id = ranking.team_id
      where ranking.final_rank < 1
        or ranking.final_rank > (
          select count(*)
          from public.teams as group_team
          where group_team.group_label = team.group_label
        )
    )
    or exists (
      select 1
      from jsonb_to_recordset(p_rankings)
        as ranking(team_id uuid, final_rank integer)
      join public.teams as team on team.id = ranking.team_id
      group by team.group_label, ranking.final_rank
      having count(*) <> 1
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_GROUP_RANKINGS';
  end if;

  normalized_note := nullif(btrim(p_tie_resolution_note), '');

  select jsonb_agg(
    jsonb_build_object(
      'team_id', team.id,
      'group_label', team.group_label,
      'final_rank', ranking.final_rank
    )
    order by team.group_label, ranking.final_rank
  )
  into normalized_rankings
  from jsonb_to_recordset(p_rankings)
    as ranking(team_id uuid, final_rank integer)
  join public.teams as team on team.id = ranking.team_id;

  before_snapshot := jsonb_build_object(
    'state', to_jsonb(current_state),
    'rankings', '[]'::jsonb
  );

  update public.teams as team
  set final_rank = ranking.final_rank
  from jsonb_to_recordset(p_rankings)
    as ranking(team_id uuid, final_rank integer)
  where team.id = ranking.team_id;

  update public.tournament_state
  set
    group_stage_status = 'finalized',
    groups_finalized_at = statement_timestamp(),
    tie_resolution_note = normalized_note
  where id = 1
  returning * into finalized_state;

  insert into public.audit_log (
    action,
    entity_type,
    entity_key,
    before_data,
    after_data
  )
  values (
    'update',
    'group_stage',
    'finalization',
    before_snapshot,
    jsonb_build_object(
      'state', to_jsonb(finalized_state),
      'rankings', normalized_rankings
    )
  );

  if normalized_note is not null then
    insert into public.audit_log (
      action,
      entity_type,
      entity_key,
      before_data,
      after_data
    )
    values (
      'update',
      'group_stage',
      'manual_tie_resolution',
      jsonb_build_object(
        'tie_resolution_note', null,
        'rankings', '[]'::jsonb
      ),
      jsonb_build_object(
        'tie_resolution_note', normalized_note,
        'rankings', normalized_rankings
      )
    );
  end if;

  return finalized_state;
end;
$$;

create or replace function public.reopen_group_standings(
  p_expected_state_updated_at timestamptz
)
returns public.tournament_state
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_state public.tournament_state%rowtype;
  reopened_state public.tournament_state%rowtype;
  current_rankings jsonb;
  quarterfinal_assignments jsonb;
begin
  select *
  into current_state
  from public.tournament_state
  where id = 1
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'TOURNAMENT_STATE_MISSING';
  end if;

  if current_state.group_stage_status <> 'finalized' then
    raise exception using
      errcode = 'P0001',
      message = 'GROUPS_ALREADY_OPEN';
  end if;

  if current_state.updated_at is distinct from p_expected_state_updated_at then
    raise exception using
      errcode = 'P0001',
      message = 'GROUP_STATE_CONFLICT';
  end if;

  perform id
  from public.matches
  where stage = 'quarterfinal'
  order by id
  for update;

  if exists (
    select 1
    from public.matches
    where stage = 'quarterfinal'
      and status <> 'unscheduled'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'QUARTERFINAL_ACTIVITY_EXISTS';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'code', code,
        'team1_id', team1_id,
        'team2_id', team2_id
      )
      order by code
    ),
    '[]'::jsonb
  )
  into quarterfinal_assignments
  from public.matches
  where stage = 'quarterfinal';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'team_id', id,
        'group_label', group_label,
        'final_rank', final_rank
      )
      order by group_label, final_rank
    ),
    '[]'::jsonb
  )
  into current_rankings
  from public.teams;

  update public.matches
  set
    team1_id = null,
    team2_id = null
  where stage = 'quarterfinal'
    and (team1_id is not null or team2_id is not null);

  update public.teams
  set final_rank = null
  where final_rank is not null;

  update public.tournament_state
  set
    group_stage_status = 'open',
    groups_finalized_at = null,
    tie_resolution_note = null
  where id = 1
  returning * into reopened_state;

  insert into public.audit_log (
    action,
    entity_type,
    entity_key,
    before_data,
    after_data
  )
  values (
    'update',
    'group_stage',
    'reopening',
    jsonb_build_object(
      'state', to_jsonb(current_state),
      'rankings', current_rankings,
      'quarterfinal_assignments', quarterfinal_assignments
    ),
    jsonb_build_object(
      'state', to_jsonb(reopened_state),
      'rankings', '[]'::jsonb,
      'quarterfinal_assignments', '[]'::jsonb
    )
  );

  return reopened_state;
end;
$$;

revoke all on function public.prevent_finalized_group_result_changes()
  from public, anon, authenticated;
revoke all on function public.finalize_group_standings(
  timestamptz,
  jsonb,
  jsonb,
  text
) from public, anon, authenticated;
revoke all on function public.reopen_group_standings(timestamptz)
  from public, anon, authenticated;

grant execute on function public.finalize_group_standings(
  timestamptz,
  jsonb,
  jsonb,
  text
) to service_role;
grant execute on function public.reopen_group_standings(timestamptz)
  to service_role;
