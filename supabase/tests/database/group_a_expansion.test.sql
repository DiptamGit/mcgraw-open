begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(38);

select ok(
  to_regprocedure('private.expand_2026_group_a_roster()') is not null,
  'the guarded Group A expansion helper exists'
);
select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'private'
      and pg_proc.proname = 'expand_2026_group_a_roster'
      and (
        has_function_privilege('anon', pg_proc.oid, 'EXECUTE')
        or has_function_privilege(
          'authenticated',
          pg_proc.oid,
          'EXECUTE'
        )
        or has_function_privilege(
          'service_role',
          pg_proc.oid,
          'EXECUTE'
        )
      )
  ),
  0::bigint,
  'application roles cannot execute the expansion helper'
);

select is(
  (select count(*) from public.teams),
  12::bigint,
  'the expanded roster contains twelve teams'
);
select is(
  (select count(*) from public.teams where group_label = 'A'),
  6::bigint,
  'Group A contains six teams'
);
select is(
  (select count(*) from public.teams where group_label = 'B'),
  6::bigint,
  'Group B still contains six teams'
);
select is(
  (select count(*) from public.matches),
  37::bigint,
  'the tournament contains thirty-seven matches'
);
select is(
  (select count(*) from public.matches where stage = 'group'),
  30::bigint,
  'the tournament contains thirty group matches'
);
select is(
  (
    select count(*)
    from public.matches
    where stage = 'group' and group_label = 'A'
  ),
  15::bigint,
  'Group A contains fifteen matches'
);
select is(
  (
    select count(*)
    from public.matches
    where stage = 'group' and group_label = 'B'
  ),
  15::bigint,
  'Group B still contains fifteen matches'
);
select is(
  (select count(*) from public.matches where stage <> 'group'),
  7::bigint,
  'the seven knockout matches remain unchanged'
);

select ok(
  exists (
    select 1
    from public.teams
    where id = 'a0000006-0000-4000-8000-000000000006'
      and name = 'Fault Tolerant - Shankar / Mohan'
      and group_label = 'A'
      and final_rank is null
  ),
  'Fault Tolerant has its stable identity and starts unranked'
);
select is(
  (
    with expected(id, code, team1_id) as (
      values
        (
          'a1000000-0000-4000-8000-000000000011'::uuid,
          'GA-11',
          'a0000001-0000-4000-8000-000000000001'::uuid
        ),
        (
          'a1000000-0000-4000-8000-000000000012'::uuid,
          'GA-12',
          'a0000002-0000-4000-8000-000000000002'::uuid
        ),
        (
          'a1000000-0000-4000-8000-000000000013'::uuid,
          'GA-13',
          'a0000003-0000-4000-8000-000000000003'::uuid
        ),
        (
          'a1000000-0000-4000-8000-000000000014'::uuid,
          'GA-14',
          'a0000004-0000-4000-8000-000000000004'::uuid
        ),
        (
          'a1000000-0000-4000-8000-000000000015'::uuid,
          'GA-15',
          'a0000005-0000-4000-8000-000000000005'::uuid
        )
    )
    select count(*)
    from expected
    join public.matches as match
      on match.id = expected.id
      and match.code = expected.code
      and match.team1_id = expected.team1_id
      and match.team2_id = 'a0000006-0000-4000-8000-000000000006'
      and match.stage = 'group'
      and match.group_label = 'A'
  ),
  5::bigint,
  'GA-11 through GA-15 have stable identities and expected opponents'
);
select is(
  (
    select count(*)
    from public.matches
    where code in ('GA-11', 'GA-12', 'GA-13', 'GA-14', 'GA-15')
      and status = 'unscheduled'
      and scheduled_at is null
      and venue is null
      and winner_id is null
  ),
  5::bigint,
  'all five new fixtures start unscheduled and without results'
);
select is(
  (
    select count(distinct case
      when team1_id = 'a0000006-0000-4000-8000-000000000006'
        then team2_id
      else team1_id
    end)
    from public.matches
    where stage = 'group'
      and (
        team1_id = 'a0000006-0000-4000-8000-000000000006'
        or team2_id = 'a0000006-0000-4000-8000-000000000006'
      )
  ),
  5::bigint,
  'Fault Tolerant plays every original Group A team once'
);
select is(
  (
    select count(*)
    from (
      select team.id
      from public.teams as team
      left join public.matches as match
        on match.stage = 'group'
        and (match.team1_id = team.id or match.team2_id = team.id)
      group by team.id
      having count(match.id) <> 5
    ) as invalid_fixture_counts
  ),
  0::bigint,
  'every team has exactly five group fixtures'
);
select is(
  (
    select count(*)
    from public.matches
    where stage = 'group' and team1_id = team2_id
  ),
  0::bigint,
  'no team plays itself'
);
select is(
  (
    select count(*)
    from (
      select least(team1_id, team2_id), greatest(team1_id, team2_id)
      from public.matches
      where stage = 'group'
      group by least(team1_id, team2_id), greatest(team1_id, team2_id)
      having count(*) > 1
    ) as duplicate_pairings
  ),
  0::bigint,
  'no unordered group pairing is duplicated'
);
select is(
  (
    with expected(id, code, team1_id, team2_id) as (
      values
        (
          'a1000000-0000-4000-8000-000000000001'::uuid,
          'GA-01',
          'a0000001-0000-4000-8000-000000000001'::uuid,
          'a0000002-0000-4000-8000-000000000002'::uuid
        ),
        (
          'a1000000-0000-4000-8000-000000000002'::uuid,
          'GA-02',
          'a0000001-0000-4000-8000-000000000001'::uuid,
          'a0000003-0000-4000-8000-000000000003'::uuid
        ),
        (
          'a1000000-0000-4000-8000-000000000003'::uuid,
          'GA-03',
          'a0000001-0000-4000-8000-000000000001'::uuid,
          'a0000004-0000-4000-8000-000000000004'::uuid
        ),
        (
          'a1000000-0000-4000-8000-000000000004'::uuid,
          'GA-04',
          'a0000001-0000-4000-8000-000000000001'::uuid,
          'a0000005-0000-4000-8000-000000000005'::uuid
        ),
        (
          'a1000000-0000-4000-8000-000000000005'::uuid,
          'GA-05',
          'a0000002-0000-4000-8000-000000000002'::uuid,
          'a0000003-0000-4000-8000-000000000003'::uuid
        ),
        (
          'a1000000-0000-4000-8000-000000000006'::uuid,
          'GA-06',
          'a0000002-0000-4000-8000-000000000002'::uuid,
          'a0000004-0000-4000-8000-000000000004'::uuid
        ),
        (
          'a1000000-0000-4000-8000-000000000007'::uuid,
          'GA-07',
          'a0000002-0000-4000-8000-000000000002'::uuid,
          'a0000005-0000-4000-8000-000000000005'::uuid
        ),
        (
          'a1000000-0000-4000-8000-000000000008'::uuid,
          'GA-08',
          'a0000003-0000-4000-8000-000000000003'::uuid,
          'a0000004-0000-4000-8000-000000000004'::uuid
        ),
        (
          'a1000000-0000-4000-8000-000000000009'::uuid,
          'GA-09',
          'a0000003-0000-4000-8000-000000000003'::uuid,
          'a0000005-0000-4000-8000-000000000005'::uuid
        ),
        (
          'a1000000-0000-4000-8000-000000000010'::uuid,
          'GA-10',
          'a0000004-0000-4000-8000-000000000004'::uuid,
          'a0000005-0000-4000-8000-000000000005'::uuid
        )
    )
    select count(*)
    from expected
    join public.matches as match
      on match.id = expected.id
      and match.code = expected.code
      and match.team1_id = expected.team1_id
      and match.team2_id = expected.team2_id
      and match.status = 'unscheduled'
  ),
  10::bigint,
  'the original ten Group A fixtures retain their identities and data'
);
select is(
  (
    select count(*)
    from generate_series(1, 15) as fixture(number)
    join public.matches as match
      on match.id = (
        'b1000000-0000-4000-8000-'
        || lpad(fixture.number::text, 12, '0')
      )::uuid
      and match.code = 'GB-' || lpad(fixture.number::text, 2, '0')
      and match.group_label = 'B'
      and match.status = 'unscheduled'
  ),
  15::bigint,
  'all Group B fixture identities and data remain unchanged'
);
select is(
  (
    select count(*)
    from (
      values
        ('c1000000-0000-4000-8000-000000000001'::uuid, 'QF1'),
        ('c1000000-0000-4000-8000-000000000002'::uuid, 'QF2'),
        ('c1000000-0000-4000-8000-000000000003'::uuid, 'QF3'),
        ('c1000000-0000-4000-8000-000000000004'::uuid, 'QF4'),
        ('c1000000-0000-4000-8000-000000000005'::uuid, 'SF1'),
        ('c1000000-0000-4000-8000-000000000006'::uuid, 'SF2'),
        ('c1000000-0000-4000-8000-000000000007'::uuid, 'Final')
    ) as expected(id, code)
    join public.matches as match
      on match.id = expected.id
      and match.code = expected.code
      and match.status = 'unscheduled'
      and match.team1_id is null
      and match.team2_id is null
  ),
  7::bigint,
  'all knockout identities and assignments remain unchanged'
);

select lives_ok(
  $$
    update public.teams
    set final_rank = 6
    where id = 'a0000006-0000-4000-8000-000000000006'
  $$,
  'Group A final rank six is accepted'
);
select throws_ok(
  $$
    update public.teams
    set final_rank = 7
    where id = 'a0000006-0000-4000-8000-000000000006'
  $$,
  '23514',
  null,
  'Group A final rank seven is rejected'
);
update public.teams
set final_rank = null
where id = 'a0000006-0000-4000-8000-000000000006';

select is(
  (
    select count(*)
    from public.audit_log
    where action = 'insert'
      and entity_type = 'teams'
      and entity_key = 'a0000006-0000-4000-8000-000000000006'
  ),
  1::bigint,
  'the new team has a row-level insertion audit'
);
select is(
  (
    select count(*)
    from public.audit_log
    where action = 'insert'
      and entity_type = 'matches'
      and entity_key in ('GA-11', 'GA-12', 'GA-13', 'GA-14', 'GA-15')
  ),
  5::bigint,
  'the five new fixtures have row-level insertion audits'
);
select ok(
  exists (
    select 1
    from public.audit_log
    where action = 'insert'
      and entity_type = 'matches'
      and entity_key = 'GA-01'
  ),
  'existing audit history is preserved'
);
select ok(
  not has_table_privilege('anon', 'public.teams', 'INSERT'),
  'anonymous clients still cannot insert teams'
);
select ok(
  not has_table_privilege('anon', 'public.matches', 'INSERT'),
  'anonymous clients still cannot insert fixtures'
);
select is(
  jsonb_array_length(public.get_tournament_snapshot() -> 'teams'),
  12,
  'the public snapshot includes all twelve teams'
);
select is(
  jsonb_array_length(public.get_tournament_snapshot() -> 'matches'),
  37,
  'the public snapshot includes all thirty-seven matches'
);

delete from public.matches
where code in ('GA-11', 'GA-12', 'GA-13', 'GA-14', 'GA-15');
delete from public.teams
where id = 'a0000006-0000-4000-8000-000000000006';
alter table public.teams drop constraint teams_final_rank_valid;
alter table public.teams
  add constraint teams_final_rank_valid check (
    final_rank is null
    or (group_label = 'A' and final_rank between 1 and 5)
    or (group_label = 'B' and final_rank between 1 and 6)
  );

update public.tournament_state
set
  group_stage_status = 'finalized',
  groups_finalized_at = statement_timestamp()
where id = 1;
select throws_ok(
  $$select private.expand_2026_group_a_roster()$$,
  'P0001',
  'GROUP_A_EXPANSION_REQUIRES_OPEN_GROUPS',
  'the expansion rejects a finalized group stage'
);
select is(
  (
    select count(*)
    from public.teams
    where id = 'a0000006-0000-4000-8000-000000000006'
  ),
  0::bigint,
  'the rejected finalized-state expansion changes no roster data'
);
update public.tournament_state
set
  group_stage_status = 'open',
  groups_finalized_at = null
where id = 1;

update public.matches
set
  status = 'scheduled',
  scheduled_at = statement_timestamp() + interval '1 day'
where code = 'GA-01';
select throws_ok(
  $$select private.expand_2026_group_a_roster()$$,
  'P0001',
  'GROUP_A_EXPANSION_REQUIRES_UNSCHEDULED_GROUPS',
  'the expansion rejects existing group activity'
);
select is(
  (
    select count(*)
    from public.teams
    where id = 'a0000006-0000-4000-8000-000000000006'
  ),
  0::bigint,
  'the rejected active-group expansion changes no roster data'
);
update public.matches
set
  status = 'unscheduled',
  scheduled_at = null
where code = 'GA-01';

update public.matches
set team1_id = 'a0000001-0000-4000-8000-000000000001'
where code = 'QF1';
select throws_ok(
  $$select private.expand_2026_group_a_roster()$$,
  'P0001',
  'GROUP_A_EXPANSION_REQUIRES_UNASSIGNED_KNOCKOUT',
  'the expansion rejects an existing knockout assignment'
);
select is(
  (
    select count(*)
    from public.teams
    where id = 'a0000006-0000-4000-8000-000000000006'
  ),
  0::bigint,
  'the rejected assigned-knockout expansion changes no roster data'
);
update public.matches
set team1_id = null
where code = 'QF1';

select lives_ok(
  $$select private.expand_2026_group_a_roster()$$,
  'the expansion succeeds from the approved baseline state'
);
select is(
  jsonb_build_object(
    'teams', (select count(*) from public.teams),
    'matches', (select count(*) from public.matches)
  ),
  '{"teams": 12, "matches": 37}'::jsonb,
  'the successful guarded expansion commits the complete data change'
);
select lives_ok(
  $$
    update public.teams
    set final_rank = 6
    where id = 'a0000006-0000-4000-8000-000000000006'
  $$,
  'the guarded expansion installs the six-rank Group A constraint'
);

select * from finish();
rollback;
