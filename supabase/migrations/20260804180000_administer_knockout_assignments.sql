create or replace function public.guard_locked_knockout_result()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  downstream_code text;
  downstream_team_slot text;
  downstream_team_id uuid;
begin
  if old.stage = 'group'
    or old.code = 'Final'
    or not (
      old.status is distinct from new.status
      or old.deciding_set_format is distinct from new.deciding_set_format
      or old.outcome_type is distinct from new.outcome_type
      or old.sets is distinct from new.sets
      or old.winner_id is distinct from new.winner_id
      or old.played_at is distinct from new.played_at
      or old.completed_at is distinct from new.completed_at
    )
  then
    return new;
  end if;

  select
    path.downstream_code,
    path.downstream_team_slot
  into
    downstream_code,
    downstream_team_slot
  from (
    values
      ('QF1', 'SF1', 'team1_id'),
      ('QF2', 'SF1', 'team2_id'),
      ('QF3', 'SF2', 'team1_id'),
      ('QF4', 'SF2', 'team2_id'),
      ('SF1', 'Final', 'team1_id'),
      ('SF2', 'Final', 'team2_id')
  ) as path(source_code, downstream_code, downstream_team_slot)
  where path.source_code = old.code;

  if downstream_code is null then
    raise exception using
      errcode = 'P0001',
      message = 'KNOCKOUT_PATH_INVALID';
  end if;

  select case downstream_team_slot
    when 'team1_id' then match.team1_id
    else match.team2_id
  end
  into downstream_team_id
  from public.matches as match
  where match.code = downstream_code;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'KNOCKOUT_PATH_INVALID';
  end if;

  if downstream_team_id is not null then
    raise exception using
      errcode = 'P0001',
      message = 'UPSTREAM_RESULT_LOCKED';
  end if;

  return new;
end;
$$;

create trigger matches_guard_locked_knockout_result
before update on public.matches
for each row execute function public.guard_locked_knockout_result();

revoke all on function public.guard_locked_knockout_result()
  from public, anon, authenticated;

create or replace function public.update_knockout_assignment(
  p_intent text,
  p_downstream_code text,
  p_team_slot text,
  p_expected_downstream_updated_at timestamptz,
  p_expected_source_updated_at timestamptz,
  p_team_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  source_code text;
  expected_source_stage text;
  expected_downstream_stage text;
  source_match public.matches%rowtype;
  downstream_match public.matches%rowtype;
  current_team_id uuid;
  other_team_id uuid;
begin
  if p_intent not in ('assign', 'clear') then
    raise exception using
      errcode = 'P0001',
      message = 'KNOCKOUT_ASSIGNMENT_INTENT_INVALID';
  end if;

  select
    path.source_code,
    path.source_stage,
    path.downstream_stage
  into
    source_code,
    expected_source_stage,
    expected_downstream_stage
  from (
    values
      ('SF1', 'team1_id', 'QF1', 'quarterfinal', 'semifinal'),
      ('SF1', 'team2_id', 'QF2', 'quarterfinal', 'semifinal'),
      ('SF2', 'team1_id', 'QF3', 'quarterfinal', 'semifinal'),
      ('SF2', 'team2_id', 'QF4', 'quarterfinal', 'semifinal'),
      ('Final', 'team1_id', 'SF1', 'semifinal', 'final'),
      ('Final', 'team2_id', 'SF2', 'semifinal', 'final')
  ) as path(
    downstream_code,
    team_slot,
    source_code,
    source_stage,
    downstream_stage
  )
  where path.downstream_code = p_downstream_code
    and path.team_slot = p_team_slot;

  if source_code is null then
    raise exception using
      errcode = 'P0001',
      message = 'KNOCKOUT_PATH_INVALID';
  end if;

  select *
  into source_match
  from public.matches
  where code = source_code
  for update;

  if not found or source_match.stage <> expected_source_stage then
    raise exception using
      errcode = 'P0001',
      message = 'KNOCKOUT_PATH_INVALID';
  end if;

  select *
  into downstream_match
  from public.matches
  where code = p_downstream_code
  for update;

  if not found or downstream_match.stage <> expected_downstream_stage then
    raise exception using
      errcode = 'P0001',
      message = 'KNOCKOUT_PATH_INVALID';
  end if;

  if source_match.updated_at is distinct from p_expected_source_updated_at then
    raise exception using
      errcode = 'P0001',
      message = 'SOURCE_MATCH_CONFLICT';
  end if;

  if downstream_match.updated_at is distinct from
    p_expected_downstream_updated_at
  then
    raise exception using
      errcode = 'P0001',
      message = 'DOWNSTREAM_MATCH_CONFLICT';
  end if;

  if downstream_match.status <> 'unscheduled' then
    raise exception using
      errcode = 'P0001',
      message = 'DOWNSTREAM_MATCH_PROTECTED';
  end if;

  if source_match.status <> 'completed'
    or source_match.winner_id is null
  then
    raise exception using
      errcode = 'P0001',
      message = 'SOURCE_RESULT_INCOMPLETE';
  end if;

  current_team_id := case p_team_slot
    when 'team1_id' then downstream_match.team1_id
    else downstream_match.team2_id
  end;
  other_team_id := case p_team_slot
    when 'team1_id' then downstream_match.team2_id
    else downstream_match.team1_id
  end;

  if p_intent = 'assign' then
    if current_team_id is not null then
      raise exception using
        errcode = 'P0001',
        message = case
          when current_team_id = p_team_id
            then 'DOWNSTREAM_ASSIGNMENT_EXISTS'
          else 'DOWNSTREAM_ASSIGNMENT_CONFLICT'
        end;
    end if;

    if other_team_id = p_team_id then
      raise exception using
        errcode = 'P0001',
        message = 'DUPLICATE_DOWNSTREAM_TEAM';
    end if;

    if source_match.winner_id <> p_team_id then
      raise exception using
        errcode = 'P0001',
        message = 'INVALID_SOURCE_WINNER';
    end if;

    if p_team_slot = 'team1_id' then
      update public.matches
      set team1_id = p_team_id
      where id = downstream_match.id
      returning * into downstream_match;
    else
      update public.matches
      set team2_id = p_team_id
      where id = downstream_match.id
      returning * into downstream_match;
    end if;
  else
    if current_team_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'DOWNSTREAM_ASSIGNMENT_MISSING';
    end if;

    if current_team_id <> p_team_id
      or source_match.winner_id <> p_team_id
    then
      raise exception using
        errcode = 'P0001',
        message = 'DOWNSTREAM_ASSIGNMENT_CONFLICT';
    end if;

    if p_team_slot = 'team1_id' then
      update public.matches
      set team1_id = null
      where id = downstream_match.id
      returning * into downstream_match;
    else
      update public.matches
      set team2_id = null
      where id = downstream_match.id
      returning * into downstream_match;
    end if;
  end if;

  return jsonb_build_object(
    'intent', p_intent,
    'downstream_code', downstream_match.code,
    'source_code', source_match.code,
    'team_slot', p_team_slot,
    'team_id', p_team_id,
    'updated_at', downstream_match.updated_at
  );
end;
$$;

revoke all on function public.update_knockout_assignment(
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  uuid
) from public, anon, authenticated;

grant execute on function public.update_knockout_assignment(
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  uuid
) to service_role;
