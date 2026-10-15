begin;

create or replace function private.knockout_2026_source(
  p_downstream_code text,
  p_team_slot text
)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select source_code
  from (values
    ('SF1', 'team1_id', 'QF4'),
    ('SF1', 'team2_id', 'QF1'),
    ('SF2', 'team1_id', 'QF3'),
    ('SF2', 'team2_id', 'QF2'),
    ('Final', 'team1_id', 'SF1'),
    ('Final', 'team2_id', 'SF2')
  ) as path(downstream_code, team_slot, source_code)
  where downstream_code = p_downstream_code and team_slot = p_team_slot;
$$;

revoke all on function private.knockout_2026_source(text, text)
  from public, anon, authenticated, service_role;

create or replace function public.guard_locked_knockout_result()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  downstream_team_id uuid;
  downstream_found boolean := false;
  path record;
begin
  if old.stage = 'group' or old.code = 'Final' or not (
    old.status is distinct from new.status
    or old.deciding_set_format is distinct from new.deciding_set_format
    or old.outcome_type is distinct from new.outcome_type
    or old.sets is distinct from new.sets
    or old.winner_id is distinct from new.winner_id
    or old.played_at is distinct from new.played_at
    or old.completed_at is distinct from new.completed_at
  ) then
    return new;
  end if;

  for path in
    select destination.code, slot.name
    from (values ('SF1'), ('SF2'), ('Final')) as destination(code)
    cross join (values ('team1_id'), ('team2_id')) as slot(name)
    where private.knockout_2026_source(destination.code, slot.name) = old.code
  loop
    select case path.name when 'team1_id' then team1_id else team2_id end
    into downstream_team_id
    from public.matches where code = path.code;
    if not found then
      raise exception using errcode = 'P0001', message = 'KNOCKOUT_PATH_INVALID';
    end if;
    downstream_found := true;
    if downstream_team_id is not null then
      raise exception using errcode = 'P0001', message = 'UPSTREAM_RESULT_LOCKED';
    end if;
  end loop;
  if not downstream_found then
    raise exception using errcode = 'P0001', message = 'KNOCKOUT_PATH_INVALID';
  end if;
  return new;
end;
$$;

-- The trigger executes as the caller; the helper exposes only fixed match codes.
grant usage on schema private to service_role;
grant execute on function private.knockout_2026_source(text, text) to service_role;

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
  source_match public.matches%rowtype;
  downstream_match public.matches%rowtype;
  current_team_id uuid;
  other_team_id uuid;
begin
  if p_intent is null or p_intent not in ('assign', 'clear') then
    raise exception using errcode = 'P0001', message = 'KNOCKOUT_ASSIGNMENT_INTENT_INVALID';
  end if;
  source_code := private.knockout_2026_source(p_downstream_code, p_team_slot);
  if source_code is null then
    raise exception using errcode = 'P0001', message = 'KNOCKOUT_PATH_INVALID';
  end if;
  select * into source_match from public.matches
  where code = source_code for update;
  if not found or source_match.stage <> (case
    when p_downstream_code = 'Final' then 'semifinal' else 'quarterfinal' end)
  then
    raise exception using errcode = 'P0001', message = 'KNOCKOUT_PATH_INVALID';
  end if;
  select * into downstream_match from public.matches
  where code = p_downstream_code for update;
  if not found or downstream_match.stage <> (case
    when p_downstream_code = 'Final' then 'final' else 'semifinal' end)
  then
    raise exception using errcode = 'P0001', message = 'KNOCKOUT_PATH_INVALID';
  end if;
  if source_match.updated_at is distinct from p_expected_source_updated_at then
    raise exception using errcode = 'P0001', message = 'SOURCE_MATCH_CONFLICT';
  end if;
  if downstream_match.updated_at is distinct from p_expected_downstream_updated_at then
    raise exception using errcode = 'P0001', message = 'DOWNSTREAM_MATCH_CONFLICT';
  end if;
  if downstream_match.status <> 'unscheduled' then
    raise exception using errcode = 'P0001', message = 'DOWNSTREAM_MATCH_PROTECTED';
  end if;
  if source_match.status <> 'completed' or source_match.winner_id is null then
    raise exception using errcode = 'P0001', message = 'SOURCE_RESULT_INCOMPLETE';
  end if;
  current_team_id := case p_team_slot
    when 'team1_id' then downstream_match.team1_id else downstream_match.team2_id end;
  other_team_id := case p_team_slot
    when 'team1_id' then downstream_match.team2_id else downstream_match.team1_id end;
  if p_intent = 'assign' then
    if current_team_id is not null then
      raise exception using errcode = 'P0001', message = case
        when current_team_id = p_team_id then 'DOWNSTREAM_ASSIGNMENT_EXISTS'
        else 'DOWNSTREAM_ASSIGNMENT_CONFLICT' end;
    end if;
    if other_team_id = p_team_id then
      raise exception using errcode = 'P0001', message = 'DUPLICATE_DOWNSTREAM_TEAM';
    end if;
    if p_team_id is null or source_match.winner_id <> p_team_id then
      raise exception using errcode = 'P0001', message = 'INVALID_SOURCE_WINNER';
    end if;
  else
    if current_team_id is null then
      raise exception using errcode = 'P0001', message = 'DOWNSTREAM_ASSIGNMENT_MISSING';
    end if;
    if p_team_id is null or current_team_id <> p_team_id or source_match.winner_id <> p_team_id then
      raise exception using errcode = 'P0001', message = 'DOWNSTREAM_ASSIGNMENT_CONFLICT';
    end if;
  end if;

  update public.matches
  set
    team1_id = case when p_team_slot = 'team1_id'
      then case when p_intent = 'assign' then p_team_id end else team1_id end,
    team2_id = case when p_team_slot = 'team2_id'
      then case when p_intent = 'assign' then p_team_id end else team2_id end
  where id = downstream_match.id returning * into downstream_match;
  return jsonb_build_object(
    'intent', p_intent, 'downstream_code', downstream_match.code,
    'source_code', source_match.code, 'team_slot', p_team_slot,
    'team_id', p_team_id, 'updated_at', downstream_match.updated_at
  );
end;
$$;

revoke all on function public.update_knockout_assignment(
  text, text, text, timestamptz, timestamptz, uuid
) from public, anon, authenticated;
grant execute on function public.update_knockout_assignment(
  text, text, text, timestamptz, timestamptz, uuid
) to service_role;

create or replace function public.reconcile_2026_knockout(p_expected_snapshot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  before_snapshot jsonb;
  after_snapshot jsonb;
  group_rows_before jsonb;
  group_rows_after jsonb;
  current_state public.tournament_state%rowtype;
  rankings jsonb;
  match_versions jsonb;
  result record;
  slot record;
  source_match public.matches%rowtype;
  downstream_match public.matches%rowtype;
begin
  lock table public.tournament_state, public.teams, public.matches
    in share row exclusive mode;
  select * into current_state from public.tournament_state where id = 1 for update;
  if exists (
    select 1 from public.audit_log
    where entity_type = 'tournament_reconciliation' and entity_key = 'MGO-033'
  ) then
    raise exception using errcode = 'P0001', message = 'RECONCILIATION_ALREADY_APPLIED';
  end if;
  before_snapshot := public.get_tournament_snapshot();
  if p_expected_snapshot is distinct from before_snapshot then
    raise exception using errcode = 'P0001', message = 'RECONCILIATION_CONFLICT';
  end if;
  if current_state.group_stage_status is distinct from 'open'
    or (select count(*) from public.teams) <> 12
    or (select count(*) from public.matches) <> 37
    or (select count(*) from public.matches where stage = 'group' and status = 'completed') <> 30
    or exists (select 1 from public.teams where final_rank is not null)
    or exists (
      select 1 from public.matches where stage <> 'group' and (
        status <> 'unscheduled' or team1_id is not null or team2_id is not null
        or scheduled_at is not null or venue is not null
      )
    )
    or exists (
      select 1 from public.audit_log where entity_type = 'matches'
      and after_data ->> 'stage' <> 'group'
      and after_data ->> 'status' in ('scheduled', 'completed')
    )
  then
    raise exception using errcode = 'P0001', message = 'RECONCILIATION_BASELINE_INVALID';
  end if;

  with expected(id, name, group_label, final_rank) as (values
    ('a0000006-0000-4000-8000-000000000006'::uuid, 'Fault Tolerant - Shankar / Mohan', 'A', 1),
    ('a0000003-0000-4000-8000-000000000003'::uuid, 'Deuce Detectives - Anindya / Damodhar', 'A', 2),
    ('a0000001-0000-4000-8000-000000000001'::uuid, 'Net Results - Ranjit / Venu C', 'A', 3),
    ('a0000004-0000-4000-8000-000000000004'::uuid, 'Lob Stars - Amit Anand / Kaushtab', 'A', 4),
    ('a0000002-0000-4000-8000-000000000002'::uuid, 'Volley Llamas - Kiran / Venu K', 'A', 5),
    ('a0000005-0000-4000-8000-000000000005'::uuid, 'Smash Potatoes - Withdrawn', 'A', 6),
    ('b0000004-0000-4000-8000-000000000004'::uuid, 'Drop Shot Society - Giri / Srini', 'B', 1),
    ('b0000003-0000-4000-8000-000000000003'::uuid, 'Spin Doctors - Nil / Kaushik', 'B', 2),
    ('b0000001-0000-4000-8000-000000000001'::uuid, 'Baseline Bandits - Prasad V / Srinivas', 'B', 3),
    ('b0000002-0000-4000-8000-000000000002'::uuid, 'Court Jesters - Amit Gupta / Jeet', 'B', 4),
    ('b0000005-0000-4000-8000-000000000005'::uuid, 'Rally Rascals - Arup / Diptam', 'B', 5),
    ('b0000006-0000-4000-8000-000000000006'::uuid, 'Racquet Scientists - Venkat Goli / Bhavanth', 'B', 6)
  )
  select jsonb_agg(jsonb_build_object('team_id', expected.id, 'final_rank', expected.final_rank)
    order by expected.group_label, expected.final_rank)
  into rankings from expected join public.teams as team
    on team.id = expected.id and team.name = expected.name and team.group_label = expected.group_label;
  if jsonb_array_length(rankings) is distinct from 12 then
    raise exception using errcode = 'P0001', message = 'RECONCILIATION_IDENTITIES_INVALID';
  end if;

  if exists (
    with numbered as (
      select id, group_label, substring(id::text from 8 for 1)::integer as number
      from public.teams
    ), original_pairs as (
      select first.group_label, first.id as team1_id, second.id as team2_id,
        row_number() over (partition by first.group_label order by first.number, second.number) as number
      from numbered as first join numbered as second
        on first.group_label = second.group_label and first.number < second.number
      where first.group_label = 'B' or second.number < 6
    ), expected as (
      select * from original_pairs
      union all
      select 'A', first.id, second.id, 10 + first.number
      from numbered as first cross join numbered as second
      where first.group_label = 'A' and first.number < 6
        and second.group_label = 'A' and second.number = 6
    )
    select 1 from expected left join public.matches as match
      on match.id = (lower(expected.group_label) || '1000000-0000-4000-8000-'
        || lpad(expected.number::text, 12, '0'))::uuid
      and match.code = 'G' || expected.group_label || '-' || lpad(expected.number::text, 2, '0')
      and match.stage = 'group' and match.group_label = expected.group_label
      and match.team1_id = expected.team1_id and match.team2_id = expected.team2_id
    where match.id is null
  ) or (
    select count(*) from public.matches as match
    join (values
      (1, 'QF1', 'quarterfinal'), (2, 'QF2', 'quarterfinal'),
      (3, 'QF3', 'quarterfinal'), (4, 'QF4', 'quarterfinal'),
      (5, 'SF1', 'semifinal'), (6, 'SF2', 'semifinal'), (7, 'Final', 'final')
    ) as expected(number, code, stage)
      on match.code = expected.code and match.stage = expected.stage
      and match.id = ('c1000000-0000-4000-8000-' || lpad(expected.number::text, 12, '0'))::uuid
  ) <> 7 then
    raise exception using errcode = 'P0001', message = 'RECONCILIATION_IDENTITIES_INVALID';
  end if;

  select jsonb_agg(to_jsonb(match) order by id) into group_rows_before
  from public.matches as match where stage = 'group';
  update public.teams set name = case id
    when 'b0000005-0000-4000-8000-000000000005'::uuid then 'Rally Rascals - Withdrawn'
    else 'Racquet Scientists - Withdrawn' end
  where id in ('b0000005-0000-4000-8000-000000000005', 'b0000006-0000-4000-8000-000000000006');
  select jsonb_agg(jsonb_build_object('match_id', id, 'updated_at', updated_at))
  into match_versions from public.matches where stage = 'group';
  select * into current_state from public.finalize_group_standings(
    current_state.updated_at, match_versions, rankings, ''
  );
  select jsonb_agg(jsonb_build_object('match_id', id, 'updated_at', updated_at))
  into match_versions from public.matches where stage = 'quarterfinal';
  perform public.assign_quarterfinal_teams(current_state.updated_at, match_versions);

  for result in
    select * from (values
      ('QF1', '[[6,4],[2,6],[2,6]]'::jsonb, 'b0000002-0000-4000-8000-000000000002'::uuid, '2026-10-13T23:00:00Z'::timestamptz),
      ('QF2', '[[6,7],[6,7]]'::jsonb, 'b0000001-0000-4000-8000-000000000001'::uuid, '2026-10-13T23:00:00Z'::timestamptz),
      ('QF3', '[[6,1],[7,6]]'::jsonb, 'a0000001-0000-4000-8000-000000000001'::uuid, '2026-10-13T23:00:00Z'::timestamptz),
      ('QF4', '[[3,6],[2,6]]'::jsonb, 'b0000004-0000-4000-8000-000000000004'::uuid, '2026-10-14T22:00:00Z'::timestamptz)
    ) as approved(code, sets, winner_id, played_at)
  loop
    if result.played_at > statement_timestamp() then
      raise exception using errcode = 'P0001', message = 'RECONCILIATION_FUTURE_RESULT';
    end if;
    update public.matches set status = 'completed', outcome_type = 'normal',
      deciding_set_format = 'full_set', sets = result.sets, winner_id = result.winner_id,
      scheduled_at = result.played_at, played_at = result.played_at,
      completed_at = statement_timestamp(), venue = 'BHS'
    where code = result.code;
  end loop;
  for slot in
    select destination.code, side.name
    from (values ('SF1'), ('SF2')) as destination(code)
    cross join (values ('team1_id'), ('team2_id')) as side(name)
    order by destination.code, side.name
  loop
    select * into source_match from public.matches
    where code = private.knockout_2026_source(slot.code, slot.name);
    select * into downstream_match from public.matches where code = slot.code;
    perform public.update_knockout_assignment(
      'assign', slot.code, slot.name, downstream_match.updated_at,
      source_match.updated_at, source_match.winner_id
    );
  end loop;
  update public.matches set label = case code
    when 'SF1' then 'SF1: Winner QF4 vs Winner QF1'
    else 'SF2: Winner QF3 vs Winner QF2' end
  where code in ('SF1', 'SF2');

  select jsonb_agg(to_jsonb(match) order by id) into group_rows_after
  from public.matches as match where stage = 'group';
  after_snapshot := public.get_tournament_snapshot();
  if group_rows_before is distinct from group_rows_after
    or (select count(*) from public.matches) <> 37
    or (select count(*) from public.teams) <> 12
    or (select to_jsonb(match) from public.matches as match where code = 'Final')
      is distinct from (select value from jsonb_array_elements(before_snapshot -> 'matches') where value ->> 'code' = 'Final')
    or (select count(distinct team_id) from (
      select team1_id as team_id from public.matches where stage = 'semifinal'
      union all select team2_id from public.matches where stage = 'semifinal'
    ) as semifinalists) <> 4
  then
    raise exception using errcode = 'P0001', message = 'RECONCILIATION_PRESERVATION_FAILED';
  end if;
  insert into public.audit_log(action, entity_type, entity_key, before_data, after_data)
  values ('update', 'tournament_reconciliation', 'MGO-033', before_snapshot,
    jsonb_build_object(
      'snapshot', after_snapshot,
      'official_order_ruling', 'Organizer-approved 2026 order supersedes automatic eligibility/order. Withdrawn teams retain historical wins; Baseline Bandits is B3 and Court Jesters B4 by explicit ruling.',
      'seeding_policy', 'QF set-win percentage, then game-win percentage; 1 vs 4, 2 vs 3. No lottery or automatic reseeding.',
      'seeds', jsonb_build_array(
        jsonb_build_object('seed', 1, 'source', 'QF4', 'sets_won', 2, 'sets_played', 2, 'games_won', 12, 'games_played', 17),
        jsonb_build_object('seed', 2, 'source', 'QF3', 'sets_won', 2, 'sets_played', 2, 'games_won', 13, 'games_played', 20),
        jsonb_build_object('seed', 3, 'source', 'QF2', 'sets_won', 2, 'sets_played', 2, 'games_won', 14, 'games_played', 26),
        jsonb_build_object('seed', 4, 'source', 'QF1', 'sets_won', 2, 'sets_played', 3, 'games_won', 16, 'games_played', 26)
      ),
      'tiebreak_points_winner_first', '{"QF2":[[7,1],[7,4]],"QF3":{"set2":[7,4]}}'::jsonb,
      'deciding_set_qualification', 'QF1 full third set; full_set is an organizer-approved administrative value for unused deciding sets in QF2-QF4.',
      'schedule_qualification', 'Confirmed played start times also backfill scheduled_at to retain BHS under the existing venue constraint.'
    )
  );
  return after_snapshot;
end;
$$;

revoke all on function public.reconcile_2026_knockout(jsonb)
  from public, anon, authenticated;
grant execute on function public.reconcile_2026_knockout(jsonb) to service_role;

commit;
