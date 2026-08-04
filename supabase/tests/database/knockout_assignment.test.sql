begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(29);

select ok(
  to_regprocedure(
    'public.update_knockout_assignment(text,text,text,timestamp with time zone,timestamp with time zone,uuid)'
  ) is not null,
  'knockout assignment RPC exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.update_knockout_assignment(text,text,text,timestamp with time zone,timestamp with time zone,uuid)'::regprocedure,
    'EXECUTE'
  ),
  'anonymous clients cannot update knockout assignments'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.update_knockout_assignment(text,text,text,timestamp with time zone,timestamp with time zone,uuid)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated clients cannot update knockout assignments'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.update_knockout_assignment(text,text,text,timestamp with time zone,timestamp with time zone,uuid)'::regprocedure,
    'EXECUTE'
  ),
  'service role can update knockout assignments'
);

update public.matches
set
  team1_id = (
    select id from public.teams order by id limit 1 offset 0
  ),
  team2_id = (
    select id from public.teams order by id limit 1 offset 1
  )
where code = 'QF1';

update public.matches
set
  team1_id = (
    select id from public.teams order by id limit 1 offset 2
  ),
  team2_id = (
    select id from public.teams order by id limit 1 offset 3
  )
where code = 'QF2';

update public.matches
set
  team1_id = (
    select id from public.teams order by id limit 1 offset 4
  ),
  team2_id = (
    select id from public.teams order by id limit 1 offset 5
  )
where code = 'QF3';

update public.matches
set
  team1_id = (
    select id from public.teams order by id limit 1 offset 6
  ),
  team2_id = (
    select id from public.teams order by id limit 1 offset 7
  )
where code = 'QF4';

select throws_ok(
  $$
    select public.update_knockout_assignment(
      'assign',
      'QF1',
      'team1_id',
      (select updated_at from public.matches where code = 'QF1'),
      (select updated_at from public.matches where code = 'QF1'),
      (select team1_id from public.matches where code = 'QF1')
    )
  $$,
  'P0001',
  'KNOCKOUT_PATH_INVALID',
  'quarterfinals cannot be downstream progression targets'
);
select throws_ok(
  $$
    select public.update_knockout_assignment(
      'assign',
      'SF1',
      'team1_id',
      (select updated_at from public.matches where code = 'SF1'),
      (select updated_at from public.matches where code = 'QF1'),
      (select team1_id from public.matches where code = 'QF1')
    )
  $$,
  'P0001',
  'SOURCE_RESULT_INCOMPLETE',
  'an incomplete source cannot populate a semifinal'
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
where stage = 'quarterfinal';

select throws_ok(
  $$
    select public.update_knockout_assignment(
      'assign',
      'SF1',
      'team1_id',
      (select updated_at from public.matches where code = 'SF1'),
      (select updated_at from public.matches where code = 'QF1'),
      (select team2_id from public.matches where code = 'QF1')
    )
  $$,
  'P0001',
  'INVALID_SOURCE_WINNER',
  'a losing team cannot advance'
);
select throws_ok(
  $$
    select public.update_knockout_assignment(
      'assign',
      'SF1',
      'team1_id',
      (select updated_at from public.matches where code = 'SF1'),
      '2026-01-01T00:00:00Z'::timestamptz,
      (select winner_id from public.matches where code = 'QF1')
    )
  $$,
  'P0001',
  'SOURCE_MATCH_CONFLICT',
  'a stale source result cannot advance'
);
select lives_ok(
  $$
    select public.update_knockout_assignment(
      'assign',
      'SF1',
      'team1_id',
      (select updated_at from public.matches where code = 'SF1'),
      (select updated_at from public.matches where code = 'QF1'),
      (select winner_id from public.matches where code = 'QF1')
    )
  $$,
  'QF1 winner advances to SF1'
);
select ok(
  (
    select semifinal.team1_id = quarterfinal.winner_id
    from public.matches as semifinal
    cross join public.matches as quarterfinal
    where semifinal.code = 'SF1'
      and quarterfinal.code = 'QF1'
  ),
  'SF1 team 1 matches the QF1 winner'
);
select throws_ok(
  $$
    select public.update_knockout_assignment(
      'assign',
      'SF1',
      'team1_id',
      (select updated_at from public.matches where code = 'SF1'),
      (select updated_at from public.matches where code = 'QF1'),
      (select winner_id from public.matches where code = 'QF1')
    )
  $$,
  'P0001',
  'DOWNSTREAM_ASSIGNMENT_EXISTS',
  'a repeated assignment is rejected'
);
select throws_ok(
  $$
    select public.update_knockout_assignment(
      'assign',
      'SF1',
      'team2_id',
      (select updated_at from public.matches where code = 'SF1'),
      (select updated_at from public.matches where code = 'QF2'),
      (select winner_id from public.matches where code = 'QF1')
    )
  $$,
  'P0001',
  'DUPLICATE_DOWNSTREAM_TEAM',
  'one team cannot occupy both semifinal slots'
);
select lives_ok(
  $$
    select public.update_knockout_assignment(
      'assign',
      'SF1',
      'team2_id',
      (select updated_at from public.matches where code = 'SF1'),
      (select updated_at from public.matches where code = 'QF2'),
      (select winner_id from public.matches where code = 'QF2')
    )
  $$,
  'QF2 winner advances to SF1'
);
select lives_ok(
  $$
    select public.update_knockout_assignment(
      'assign',
      'SF2',
      'team1_id',
      (select updated_at from public.matches where code = 'SF2'),
      (select updated_at from public.matches where code = 'QF3'),
      (select winner_id from public.matches where code = 'QF3')
    )
  $$,
  'QF3 winner advances to SF2'
);
select lives_ok(
  $$
    select public.update_knockout_assignment(
      'assign',
      'SF2',
      'team2_id',
      (select updated_at from public.matches where code = 'SF2'),
      (select updated_at from public.matches where code = 'QF4'),
      (select winner_id from public.matches where code = 'QF4')
    )
  $$,
  'QF4 winner advances to SF2'
);
select throws_ok(
  $$
    update public.matches
    set sets = '[[6, 3], [6, 3]]'::jsonb
    where code = 'QF1'
  $$,
  'P0001',
  'UPSTREAM_RESULT_LOCKED',
  'an assigned quarterfinal result cannot be corrected'
);
select lives_ok(
  $$
    select public.update_knockout_assignment(
      'clear',
      'SF1',
      'team1_id',
      (select updated_at from public.matches where code = 'SF1'),
      (select updated_at from public.matches where code = 'QF1'),
      (select winner_id from public.matches where code = 'QF1')
    )
  $$,
  'an unscheduled semifinal assignment can be cleared'
);
select is(
  (select team1_id from public.matches where code = 'SF1'),
  null::uuid,
  'clearing removes only the selected downstream slot'
);
select lives_ok(
  $$
    update public.matches
    set sets = '[[6, 3], [6, 3]]'::jsonb
    where code = 'QF1'
  $$,
  'clearing the assignment unlocks the source result'
);
select lives_ok(
  $$
    select public.update_knockout_assignment(
      'assign',
      'SF1',
      'team1_id',
      (select updated_at from public.matches where code = 'SF1'),
      (select updated_at from public.matches where code = 'QF1'),
      (select winner_id from public.matches where code = 'QF1')
    )
  $$,
  'the corrected QF1 winner can be reassigned'
);
select is(
  (
    select count(*)
    from public.audit_log
    where entity_type = 'matches'
      and entity_key = 'SF1'
      and before_data ->> 'team1_id' is not null
      and after_data ->> 'team1_id' is null
  ),
  1::bigint,
  'clearing a downstream assignment is audited with before and after data'
);
select is(
  (
    select count(*)
    from public.audit_log
    where entity_type = 'matches'
      and entity_key in ('SF1', 'SF2')
      and (
        before_data ->> 'team1_id' is distinct from
          after_data ->> 'team1_id'
        or before_data ->> 'team2_id' is distinct from
          after_data ->> 'team2_id'
      )
  ),
  6::bigint,
  'all semifinal assignments and the clear have row-level audits'
);

update public.matches
set
  status = 'completed',
  deciding_set_format = 'full_set',
  outcome_type = 'normal',
  sets = '[[6, 4], [6, 4]]'::jsonb,
  winner_id = team1_id,
  played_at = statement_timestamp() - interval '1 hour',
  completed_at = statement_timestamp()
where code in ('SF1', 'SF2');

select lives_ok(
  $$
    select public.update_knockout_assignment(
      'assign',
      'Final',
      'team1_id',
      (select updated_at from public.matches where code = 'Final'),
      (select updated_at from public.matches where code = 'SF1'),
      (select winner_id from public.matches where code = 'SF1')
    )
  $$,
  'SF1 winner advances to the Final'
);
select lives_ok(
  $$
    select public.update_knockout_assignment(
      'assign',
      'Final',
      'team2_id',
      (select updated_at from public.matches where code = 'Final'),
      (select updated_at from public.matches where code = 'SF2'),
      (select winner_id from public.matches where code = 'SF2')
    )
  $$,
  'SF2 winner advances to the Final'
);
select ok(
  (
    select
      final.team1_id = semifinal1.winner_id
      and final.team2_id = semifinal2.winner_id
    from public.matches as final
    cross join public.matches as semifinal1
    cross join public.matches as semifinal2
    where final.code = 'Final'
      and semifinal1.code = 'SF1'
      and semifinal2.code = 'SF2'
  ),
  'the Final contains both semifinal winners'
);
select throws_ok(
  $$
    update public.matches
    set sets = '[[6, 2], [6, 2]]'::jsonb
    where code = 'SF1'
  $$,
  'P0001',
  'UPSTREAM_RESULT_LOCKED',
  'an assigned semifinal result cannot be corrected'
);

update public.matches
set
  status = 'scheduled',
  scheduled_at = statement_timestamp() + interval '1 day',
  venue = 'McGraw Park Court 1'
where code = 'Final';

select throws_ok(
  $$
    select public.update_knockout_assignment(
      'clear',
      'Final',
      'team1_id',
      (select updated_at from public.matches where code = 'Final'),
      (select updated_at from public.matches where code = 'SF1'),
      (select winner_id from public.matches where code = 'SF1')
    )
  $$,
  'P0001',
  'DOWNSTREAM_MATCH_PROTECTED',
  'a scheduled downstream assignment cannot be cleared'
);
select ok(
  (
    select status = 'scheduled'
      and team1_id is not null
      and team2_id is not null
    from public.matches
    where code = 'Final'
  ),
  'a protected Final keeps its schedule and both teams'
);
select is(
  (
    select count(*)
    from public.audit_log
    where entity_type = 'matches'
      and entity_key = 'Final'
      and (
        before_data ->> 'team1_id' is distinct from
          after_data ->> 'team1_id'
        or before_data ->> 'team2_id' is distinct from
          after_data ->> 'team2_id'
      )
  ),
  2::bigint,
  'both Final assignments are audited'
);

select * from finish();
rollback;
