begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(27);

select ok(
  to_regprocedure(
    'public.assign_quarterfinal_teams(timestamp with time zone,jsonb)'
  ) is not null,
  'quarterfinal assignment RPC exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.assign_quarterfinal_teams(timestamp with time zone,jsonb)'::regprocedure,
    'EXECUTE'
  ),
  'anonymous clients cannot assign quarterfinals'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.assign_quarterfinal_teams(timestamp with time zone,jsonb)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated clients cannot assign quarterfinals'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.assign_quarterfinal_teams(timestamp with time zone,jsonb)'::regprocedure,
    'EXECUTE'
  ),
  'service role can assign quarterfinals'
);

select throws_ok(
  $$
    select public.assign_quarterfinal_teams(
      (select updated_at from public.tournament_state where id = 1),
      (
        select jsonb_agg(
          jsonb_build_object(
            'match_id', id,
            'updated_at', updated_at
          )
        )
        from public.matches
        where stage = 'quarterfinal'
      )
    )
  $$,
  'P0001',
  'GROUPS_NOT_FINALIZED',
  'live standings cannot populate the bracket'
);
select is(
  (
    select count(*)
    from public.matches
    where stage = 'quarterfinal'
      and (team1_id is not null or team2_id is not null)
  ),
  0::bigint,
  'failed early assignment leaves the bracket empty'
);

update public.teams as team
set final_rank = ranking.final_rank
from (
  select
    id,
    row_number() over (
      partition by group_label
      order by id
    )::integer as final_rank
  from public.teams
) as ranking
where team.id = ranking.id;

update public.tournament_state
set
  group_stage_status = 'finalized',
  groups_finalized_at = statement_timestamp()
where id = 1;

create temporary table submitted_quarterfinal_versions as
select id as match_id, updated_at
from public.matches
where stage = 'quarterfinal';

select lives_ok(
  $$
    select public.assign_quarterfinal_teams(
      (select updated_at from public.tournament_state where id = 1),
      (
        select jsonb_agg(
          jsonb_build_object(
            'match_id', match_id,
            'updated_at', updated_at
          )
        )
        from submitted_quarterfinal_versions
      )
    )
  $$,
  'finalized ranks populate all quarterfinals atomically'
);
select ok(
  (
    select
      match.team1_id = team1.id
      and match.team2_id = team2.id
    from public.matches as match
    join public.teams as team1
      on team1.group_label = 'A' and team1.final_rank = 1
    join public.teams as team2
      on team2.group_label = 'B' and team2.final_rank = 4
    where match.code = 'QF1'
  ),
  'QF1 receives A1 and B4'
);
select ok(
  (
    select
      match.team1_id = team1.id
      and match.team2_id = team2.id
    from public.matches as match
    join public.teams as team1
      on team1.group_label = 'A' and team1.final_rank = 2
    join public.teams as team2
      on team2.group_label = 'B' and team2.final_rank = 3
    where match.code = 'QF2'
  ),
  'QF2 receives A2 and B3'
);
select ok(
  (
    select
      match.team1_id = team1.id
      and match.team2_id = team2.id
    from public.matches as match
    join public.teams as team1
      on team1.group_label = 'A' and team1.final_rank = 3
    join public.teams as team2
      on team2.group_label = 'B' and team2.final_rank = 2
    where match.code = 'QF3'
  ),
  'QF3 receives A3 and B2'
);
select ok(
  (
    select
      match.team1_id = team1.id
      and match.team2_id = team2.id
    from public.matches as match
    join public.teams as team1
      on team1.group_label = 'A' and team1.final_rank = 4
    join public.teams as team2
      on team2.group_label = 'B' and team2.final_rank = 1
    where match.code = 'QF4'
  ),
  'QF4 receives A4 and B1'
);
select is(
  (
    select count(*)
    from public.audit_log
    where entity_type = 'bracket'
      and entity_key = 'quarterfinal_assignment'
  ),
  1::bigint,
  'assignment writes one operation-level audit entry'
);
select is(
  (
    select count(*)
    from public.audit_log
    where entity_type = 'matches'
      and entity_key in ('QF1', 'QF2', 'QF3', 'QF4')
      and action = 'update'
      and after_data ->> 'team1_id' is not null
      and after_data ->> 'team2_id' is not null
  ),
  4::bigint,
  'assignment writes row-level audits for all four matches'
);

select lives_ok(
  $$
    select public.assign_quarterfinal_teams(
      (select updated_at from public.tournament_state where id = 1),
      (
        select jsonb_agg(
          jsonb_build_object(
            'match_id', match_id,
            'updated_at', updated_at
          )
        )
        from submitted_quarterfinal_versions
      )
    )
  $$,
  'repeating the original request is idempotent'
);
select is(
  (
    select count(*)
    from public.audit_log
    where entity_type = 'bracket'
      and entity_key = 'quarterfinal_assignment'
  ),
  1::bigint,
  'idempotent retry does not create another operation audit'
);

select lives_ok(
  $$
    select public.reopen_group_standings(
      (select updated_at from public.tournament_state where id = 1)
    )
  $$,
  'groups can reopen before quarterfinal activity'
);
select is(
  (
    select count(*)
    from public.matches
    where stage = 'quarterfinal'
      and (team1_id is not null or team2_id is not null)
  ),
  0::bigint,
  'reopening clears the unscheduled assignments'
);

update public.teams as team
set final_rank = ranking.final_rank
from (
  select
    id,
    row_number() over (
      partition by group_label
      order by id
    )::integer as final_rank
  from public.teams
) as ranking
where team.id = ranking.id;

update public.tournament_state
set
  group_stage_status = 'finalized',
  groups_finalized_at = statement_timestamp()
where id = 1;

truncate table submitted_quarterfinal_versions;
insert into submitted_quarterfinal_versions
select id, updated_at
from public.matches
where stage = 'quarterfinal';

update public.matches
set label = label || ' '
where code = 'QF1';

select throws_ok(
  $$
    select public.assign_quarterfinal_teams(
      (select updated_at from public.tournament_state where id = 1),
      (
        select jsonb_agg(
          jsonb_build_object(
            'match_id', match_id,
            'updated_at', updated_at
          )
        )
        from submitted_quarterfinal_versions
      )
    )
  $$,
  'P0001',
  'QUARTERFINAL_MATCH_CONFLICT',
  'a stale bracket preview cannot assign teams'
);
select is(
  (
    select count(*)
    from public.matches
    where stage = 'quarterfinal'
      and (team1_id is not null or team2_id is not null)
  ),
  0::bigint,
  'stale assignment leaves every quarterfinal unchanged'
);

update public.matches
set team1_id = (
  select id
  from public.teams
  where group_label = 'A' and final_rank = 5
)
where code = 'QF1';

select throws_ok(
  $$
    select public.assign_quarterfinal_teams(
      (select updated_at from public.tournament_state where id = 1),
      (
        select jsonb_agg(
          jsonb_build_object(
            'match_id', id,
            'updated_at', updated_at
          )
        )
        from public.matches
        where stage = 'quarterfinal'
      )
    )
  $$,
  'P0001',
  'QUARTERFINAL_ASSIGNMENT_CONFLICT',
  'a partial existing assignment cannot be overwritten'
);
select ok(
  (
    select team1_id = (
      select id
      from public.teams
      where group_label = 'A' and final_rank = 5
    )
    and team2_id is null
    from public.matches
    where code = 'QF1'
  ),
  'blocked assignment preserves the existing partial team'
);

update public.matches
set
  team1_id = null,
  team2_id = null
where code = 'QF1';

select public.assign_quarterfinal_teams(
  (select updated_at from public.tournament_state where id = 1),
  (
    select jsonb_agg(
      jsonb_build_object(
        'match_id', id,
        'updated_at', updated_at
      )
    )
    from public.matches
    where stage = 'quarterfinal'
  )
);

update public.matches
set
  status = 'scheduled',
  scheduled_at = statement_timestamp() + interval '1 day',
  venue = 'McGraw Park Court 1'
where code = 'QF1';

select throws_ok(
  $$
    select public.assign_quarterfinal_teams(
      (select updated_at from public.tournament_state where id = 1),
      (
        select jsonb_agg(
          jsonb_build_object(
            'match_id', id,
            'updated_at', updated_at
          )
        )
        from public.matches
        where stage = 'quarterfinal'
      )
    )
  $$,
  'P0001',
  'QUARTERFINAL_ACTIVITY_EXISTS',
  'scheduled quarterfinal activity protects assignments'
);
select ok(
  (
    select status = 'scheduled'
      and team1_id is not null
      and team2_id is not null
    from public.matches
    where code = 'QF1'
  ),
  'blocked reassignment preserves the schedule and teams'
);

update public.matches
set
  status = 'unscheduled',
  scheduled_at = null,
  venue = null
where code = 'QF1';

select throws_ok(
  $$
    select public.assign_quarterfinal_teams(
      (select updated_at from public.tournament_state where id = 1),
      (
        select jsonb_agg(
          jsonb_build_object(
            'match_id', id,
            'updated_at', updated_at
          )
        )
        from public.matches
        where stage = 'quarterfinal'
      )
    )
  $$,
  'P0001',
  'QUARTERFINAL_ACTIVITY_EXISTS',
  'historical quarterfinal activity remains protected'
);
select is(
  (
    select count(*)
    from public.audit_log
    where entity_type = 'bracket'
      and entity_key = 'quarterfinal_assignment'
  ),
  2::bigint,
  'only the two real assignment transactions are audited'
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
where code = 'QF1';

select throws_ok(
  $$
    select public.assign_quarterfinal_teams(
      (select updated_at from public.tournament_state where id = 1),
      (
        select jsonb_agg(
          jsonb_build_object(
            'match_id', id,
            'updated_at', updated_at
          )
        )
        from public.matches
        where stage = 'quarterfinal'
      )
    )
  $$,
  'P0001',
  'QUARTERFINAL_ACTIVITY_EXISTS',
  'a completed quarterfinal result protects assignments'
);
select ok(
  (
    select status = 'completed'
      and winner_id = team1_id
      and sets = '[[6, 4], [6, 4]]'::jsonb
    from public.matches
    where code = 'QF1'
  ),
  'blocked reassignment preserves the completed result and teams'
);

select * from finish();
rollback;
