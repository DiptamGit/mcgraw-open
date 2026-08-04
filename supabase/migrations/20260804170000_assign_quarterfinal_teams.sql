create or replace function public.assign_quarterfinal_teams(
  p_expected_state_updated_at timestamptz,
  p_match_versions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_state public.tournament_state%rowtype;
  quarterfinal_count integer;
  expected_assignments jsonb;
  current_assignments jsonb;
  assigned_assignments jsonb;
begin
  if jsonb_typeof(p_match_versions) is distinct from 'array' then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_QUARTERFINAL_MATCH_VERSIONS';
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

  if current_state.group_stage_status <> 'finalized' then
    raise exception using
      errcode = 'P0001',
      message = 'GROUPS_NOT_FINALIZED';
  end if;

  if current_state.updated_at is distinct from p_expected_state_updated_at then
    raise exception using
      errcode = 'P0001',
      message = 'GROUP_STATE_CONFLICT';
  end if;

  perform id
  from public.matches
  where stage = 'quarterfinal'
  order by code
  for update;

  select count(*)
  into quarterfinal_count
  from public.matches
  where stage = 'quarterfinal';

  if quarterfinal_count <> 4
    or exists (
      select 1
      from public.matches
      where stage = 'quarterfinal'
        and code not in ('QF1', 'QF2', 'QF3', 'QF4')
    )
    or exists (
      select required.code
      from (
        values ('QF1'), ('QF2'), ('QF3'), ('QF4')
      ) as required(code)
      left join public.matches as match
        on match.code = required.code
        and match.stage = 'quarterfinal'
      where match.id is null
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'QUARTERFINAL_MATCHES_INVALID';
  end if;

  if exists (
    select 1
    from public.matches
    where stage = 'quarterfinal'
      and status <> 'unscheduled'
  )
  or exists (
    select 1
    from public.audit_log
    where entity_type = 'matches'
      and after_data ->> 'stage' = 'quarterfinal'
      and after_data ->> 'status' in ('scheduled', 'completed')
  )
  then
    raise exception using
      errcode = 'P0001',
      message = 'QUARTERFINAL_ACTIVITY_EXISTS';
  end if;

  with required_assignments (
    code,
    team1_group,
    team1_rank,
    team2_group,
    team2_rank
  ) as (
    values
      ('QF1', 'A', 1, 'B', 4),
      ('QF2', 'A', 2, 'B', 3),
      ('QF3', 'A', 3, 'B', 2),
      ('QF4', 'A', 4, 'B', 1)
  )
  select jsonb_agg(
    jsonb_build_object(
      'code', required.code,
      'team1_id', team1.id,
      'team2_id', team2.id
    )
    order by required.code
  )
  into expected_assignments
  from required_assignments as required
  join public.teams as team1
    on team1.group_label = required.team1_group
    and team1.final_rank = required.team1_rank
  join public.teams as team2
    on team2.group_label = required.team2_group
    and team2.final_rank = required.team2_rank;

  if coalesce(jsonb_array_length(expected_assignments), 0) <> 4 then
    raise exception using
      errcode = 'P0001',
      message = 'FINAL_RANKS_INCOMPLETE';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'code', code,
      'team1_id', team1_id,
      'team2_id', team2_id
    )
    order by code
  )
  into current_assignments
  from public.matches
  where stage = 'quarterfinal';

  if not exists (
    select 1
    from jsonb_to_recordset(expected_assignments)
      as expected(code text, team1_id uuid, team2_id uuid)
    join public.matches as match on match.code = expected.code
    where match.team1_id is distinct from expected.team1_id
      or match.team2_id is distinct from expected.team2_id
  ) then
    return expected_assignments;
  end if;

  if exists (
    select 1
    from public.matches
    where stage = 'quarterfinal'
      and (team1_id is not null or team2_id is not null)
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'QUARTERFINAL_ASSIGNMENT_CONFLICT';
  end if;

  if jsonb_array_length(p_match_versions) <> quarterfinal_count
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
      where match.stage = 'quarterfinal'
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
        and match.stage = 'quarterfinal'
      where match.id is null
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'QUARTERFINAL_MATCH_CONFLICT';
  end if;

  update public.matches as match
  set
    team1_id = assignment.team1_id,
    team2_id = assignment.team2_id
  from jsonb_to_recordset(expected_assignments)
    as assignment(code text, team1_id uuid, team2_id uuid)
  where match.code = assignment.code
    and match.stage = 'quarterfinal';

  select jsonb_agg(
    jsonb_build_object(
      'code', code,
      'team1_id', team1_id,
      'team2_id', team2_id
    )
    order by code
  )
  into assigned_assignments
  from public.matches
  where stage = 'quarterfinal';

  insert into public.audit_log (
    action,
    entity_type,
    entity_key,
    before_data,
    after_data
  )
  values (
    'update',
    'bracket',
    'quarterfinal_assignment',
    jsonb_build_object(
      'group_stage_state', to_jsonb(current_state),
      'assignments', current_assignments
    ),
    jsonb_build_object(
      'group_stage_state', to_jsonb(current_state),
      'assignments', assigned_assignments
    )
  );

  return assigned_assignments;
end;
$$;

revoke all on function public.assign_quarterfinal_teams(
  timestamptz,
  jsonb
) from public, anon, authenticated;

grant execute on function public.assign_quarterfinal_teams(
  timestamptz,
  jsonb
) to service_role;
