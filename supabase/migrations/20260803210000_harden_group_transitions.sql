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

create or replace function public.get_tournament_snapshot()
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'teams',
    coalesce(
      (
        select jsonb_agg(to_jsonb(team_record) order by group_label, name)
        from public.teams as team_record
      ),
      '[]'::jsonb
    ),
    'matches',
    coalesce(
      (
        select jsonb_agg(to_jsonb(match_record) order by code)
        from public.matches as match_record
      ),
      '[]'::jsonb
    ),
    'state',
    (
      select to_jsonb(state_record)
      from public.tournament_state as state_record
      where id = 1
    )
  );
$$;

revoke all on function public.reopen_group_standings(timestamptz)
  from public, anon, authenticated;
revoke all on function public.get_tournament_snapshot()
  from public, anon, authenticated;

grant execute on function public.reopen_group_standings(timestamptz)
  to service_role;
grant execute on function public.get_tournament_snapshot()
  to anon, authenticated, service_role;
