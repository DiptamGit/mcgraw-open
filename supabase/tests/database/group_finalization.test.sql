begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(30);

select ok(
  to_regprocedure(
    'public.finalize_group_standings(timestamp with time zone,jsonb,jsonb,text)'
  ) is not null,
  'finalization RPC exists'
);
select ok(
  to_regprocedure(
    'public.reopen_group_standings(timestamp with time zone)'
  ) is not null,
  'reopening RPC exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.finalize_group_standings(timestamp with time zone,jsonb,jsonb,text)'::regprocedure,
    'EXECUTE'
  ),
  'anonymous clients cannot finalize groups'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.reopen_group_standings(timestamp with time zone)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated clients cannot reopen groups'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.finalize_group_standings(timestamp with time zone,jsonb,jsonb,text)'::regprocedure,
    'EXECUTE'
  ),
  'service role can finalize groups'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.reopen_group_standings(timestamp with time zone)'::regprocedure,
    'EXECUTE'
  ),
  'service role can reopen groups'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.prevent_finalized_group_result_changes()'::regprocedure,
    'EXECUTE'
  ),
  'browser roles cannot execute the result-lock trigger'
);
select ok(
  has_function_privilege(
    'anon',
    'public.get_tournament_snapshot()'::regprocedure,
    'EXECUTE'
  ),
  'anonymous readers can execute the tournament snapshot'
);
select is(
  jsonb_array_length(
    public.get_tournament_snapshot() -> 'teams'
  ),
  11,
  'the atomic snapshot includes every team'
);
select is(
  jsonb_array_length(
    public.get_tournament_snapshot() -> 'matches'
  ),
  32,
  'the atomic snapshot includes every match'
);

select throws_ok(
  $$
    select public.finalize_group_standings(
      (select updated_at from public.tournament_state where id = 1),
      (
        select jsonb_agg(
          jsonb_build_object(
            'match_id', id,
            'updated_at', updated_at
          )
        )
        from public.matches
        where stage = 'group'
      ),
      (
        select jsonb_agg(
          jsonb_build_object(
            'team_id', id,
            'final_rank', final_rank
          )
        )
        from (
          select
            id,
            row_number() over (
              partition by group_label
              order by id
            )::integer as final_rank
          from public.teams
        ) as ranked_teams
      ),
      null
    )
  $$,
  'P0001',
  'GROUP_MATCHES_INCOMPLETE',
  'groups cannot be finalized before every result is complete'
);
select is(
  (select group_stage_status from public.tournament_state where id = 1),
  'open',
  'failed early finalization leaves groups open'
);

update public.matches
set
  status = 'completed',
  deciding_set_format = 'full_set',
  outcome_type = 'normal',
  sets = '[[6, 4], [6, 4]]'::jsonb,
  winner_id = team1_id,
  played_at = statement_timestamp() - interval '1 day',
  completed_at = statement_timestamp()
where stage = 'group';

select lives_ok(
  $$
    select public.finalize_group_standings(
      (select updated_at from public.tournament_state where id = 1),
      (
        select jsonb_agg(
          jsonb_build_object(
            'match_id', id,
            'updated_at', updated_at
          )
        )
        from public.matches
        where stage = 'group'
      ),
      (
        select jsonb_agg(
          jsonb_build_object(
            'team_id', id,
            'final_rank', final_rank
          )
        )
        from (
          select
            id,
            row_number() over (
              partition by group_label
              order by id
            )::integer as final_rank
          from public.teams
        ) as ranked_teams
      ),
      'Organizer draw after every automatic tiebreak remained equal.'
    )
  $$,
  'complete group standings can be finalized atomically'
);
select is(
  (select group_stage_status from public.tournament_state where id = 1),
  'finalized',
  'finalization locks the group stage'
);
select is(
  (select count(*) from public.teams where final_rank is not null),
  11::bigint,
  'finalization snapshots every team rank'
);
select is(
  (select tie_resolution_note from public.tournament_state where id = 1),
  'Organizer draw after every automatic tiebreak remained equal.',
  'finalization stores the manual tie reason'
);
select is(
  (
    select count(*)
    from public.audit_log
    where entity_type = 'group_stage'
      and entity_key = 'finalization'
  ),
  1::bigint,
  'finalization writes an operation-level audit entry'
);
select is(
  (
    select count(*)
    from public.audit_log
    where entity_type = 'group_stage'
      and entity_key = 'manual_tie_resolution'
  ),
  1::bigint,
  'manual tie resolution writes its own audit entry'
);
select throws_ok(
  $$
    update public.matches
    set winner_id = team2_id
    where code = 'GA-01'
  $$,
  'P0001',
  'GROUP_RESULTS_FINALIZED',
  'finalized group results cannot be changed directly'
);

update public.matches
set
  team1_id = (
    select id
    from public.teams
    where group_label = 'A' and final_rank = 1
  ),
  team2_id = (
    select id
    from public.teams
    where group_label = 'B' and final_rank = 4
  )
where code = 'QF1';

select lives_ok(
  $$
    select public.reopen_group_standings(
      (select updated_at from public.tournament_state where id = 1)
    )
  $$,
  'groups can reopen while assigned quarterfinals remain unscheduled'
);
select ok(
  (
    select group_stage_status = 'open'
      and groups_finalized_at is null
      and tie_resolution_note is null
    from public.tournament_state
    where id = 1
  )
  and (select count(*) from public.teams where final_rank is not null) = 0,
  'reopening clears state, finalization time, tie note, and final ranks'
);
select is(
  (
    select count(*)
    from public.matches
    where stage = 'quarterfinal'
      and (team1_id is not null or team2_id is not null)
  ),
  0::bigint,
  'reopening clears unscheduled quarterfinal assignments'
);
select is(
  (
    select count(*)
    from public.audit_log
    where entity_type = 'group_stage'
      and entity_key = 'reopening'
  ),
  1::bigint,
  'reopening writes an operation-level audit entry'
);

select lives_ok(
  $$
    update public.matches
    set
      sets = '[[4, 6], [4, 6]]'::jsonb,
      winner_id = team2_id
    where code = 'GA-01'
  $$,
  'reopening restores group-result correction access'
);

select public.finalize_group_standings(
  (select updated_at from public.tournament_state where id = 1),
  (
    select jsonb_agg(
      jsonb_build_object(
        'match_id', id,
        'updated_at', updated_at
      )
    )
    from public.matches
    where stage = 'group'
  ),
  (
    select jsonb_agg(
      jsonb_build_object(
        'team_id', id,
        'final_rank', final_rank
      )
    )
    from (
      select
        id,
        row_number() over (
          partition by group_label
          order by id
        )::integer as final_rank
      from public.teams
    ) as ranked_teams
  ),
  null
);

update public.matches
set
  team1_id = (
    select id
    from public.teams
    where group_label = 'A' and final_rank = 1
  ),
  team2_id = (
    select id
    from public.teams
    where group_label = 'B' and final_rank = 4
  ),
  status = 'scheduled',
  scheduled_at = statement_timestamp() + interval '1 day',
  venue = 'McGraw Park Court 1'
where code = 'QF1';

select throws_ok(
  $$
    select public.reopen_group_standings(
      (select updated_at from public.tournament_state where id = 1)
    )
  $$,
  'P0001',
  'QUARTERFINAL_ACTIVITY_EXISTS',
  'scheduled quarterfinal activity blocks reopening'
);
select is(
  (select group_stage_status from public.tournament_state where id = 1),
  'finalized',
  'blocked reopening leaves the group stage finalized'
);
select is(
  (select count(*) from public.teams where final_rank is not null),
  11::bigint,
  'blocked reopening preserves final ranks'
);
select ok(
  (
    select status = 'scheduled'
      and team1_id is not null
      and team2_id is not null
    from public.matches
    where code = 'QF1'
  ),
  'blocked reopening preserves the quarterfinal schedule and assignments'
);

update public.matches
set
  status = 'unscheduled',
  scheduled_at = null,
  venue = null
where code = 'QF1';

select throws_ok(
  $$
    select public.reopen_group_standings(
      (select updated_at from public.tournament_state where id = 1)
    )
  $$,
  'P0001',
  'QUARTERFINAL_ACTIVITY_EXISTS',
  'clearing a quarterfinal schedule does not restore reopening access'
);
select is(
  (select group_stage_status from public.tournament_state where id = 1),
  'finalized',
  'historical quarterfinal activity leaves finalized data unchanged'
);

select * from finish();
rollback;
