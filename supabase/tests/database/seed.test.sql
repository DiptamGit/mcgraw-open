begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(19);

select is(
  (select count(*) from public.teams),
  11::bigint,
  'the seed creates exactly 11 teams'
);
select is(
  (select count(*) from public.teams where group_label = 'A'),
  5::bigint,
  'Group A contains five teams'
);
select is(
  (select count(*) from public.teams where group_label = 'B'),
  6::bigint,
  'Group B contains six teams'
);
select is(
  (select count(*) from public.matches where stage = 'group'),
  25::bigint,
  'the seed creates 25 group matches'
);
select is(
  (
    select count(*)
    from public.matches
    where stage = 'group' and group_label = 'A'
  ),
  10::bigint,
  'Group A contains ten round-robin matches'
);
select is(
  (
    select count(*)
    from public.matches
    where stage = 'group' and group_label = 'B'
  ),
  15::bigint,
  'Group B contains fifteen round-robin matches'
);
select is(
  (select count(*) from public.matches where stage = 'quarterfinal'),
  4::bigint,
  'the seed creates four quarterfinals'
);
select is(
  (select count(*) from public.matches where stage = 'semifinal'),
  2::bigint,
  'the seed creates two semifinals'
);
select is(
  (select count(*) from public.matches where stage = 'final'),
  1::bigint,
  'the seed creates one final'
);
select is(
  (select count(*) from public.matches),
  32::bigint,
  'the seed creates exactly 32 matches'
);
select is(
  (
    select count(*)
    from public.matches
    where team1_id = team2_id
  ),
  0::bigint,
  'no team plays itself'
);
select is(
  (
    select count(*)
    from (
      select
        least(team1_id, team2_id),
        greatest(team1_id, team2_id)
      from public.matches
      where stage = 'group'
      group by
        least(team1_id, team2_id),
        greatest(team1_id, team2_id)
      having count(*) > 1
    ) duplicate_pairings
  ),
  0::bigint,
  'no group pairing is duplicated'
);
select is(
  (
    select count(*)
    from (
      select team.id
      from public.teams team
      left join public.matches match
        on match.stage = 'group'
        and (
          match.team1_id = team.id
          or match.team2_id = team.id
        )
      group by team.id, team.group_label
      having count(match.id) <> case team.group_label
        when 'A' then 4
        when 'B' then 5
      end
    ) invalid_team_schedules
  ),
  0::bigint,
  'every team has the expected number of group matches'
);
select is(
  (select count(*) from public.teams where final_rank is not null),
  0::bigint,
  'all final ranks start empty'
);
select is(
  (
    select count(*)
    from public.tournament_state
    where id = 1
      and group_stage_status = 'open'
      and groups_finalized_at is null
      and tie_resolution_note is null
  ),
  1::bigint,
  'the tournament starts open and unfinalized'
);
select is(
  (
    select jsonb_object_agg(code, label)
    from public.matches
    where stage <> 'group'
  ),
  '{
    "QF1": "QF1: A1 vs B4",
    "QF2": "QF2: A2 vs B3",
    "QF3": "QF3: A3 vs B2",
    "QF4": "QF4: A4 vs B1",
    "SF1": "SF1: Winner QF1 vs Winner QF2",
    "SF2": "SF2: Winner QF3 vs Winner QF4",
    "Final": "Final: Winner SF1 vs Winner SF2"
  }'::jsonb,
  'knockout labels preserve every fixed source mapping'
);
select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'private'
      and pg_proc.proname = 'seed_2026_tournament'
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
  'application roles cannot execute the seed helper'
);

create temporary table audit_count_before_reseed as
select count(*) as row_count
from public.audit_log;

select lives_ok(
  $$select private.seed_2026_tournament()$$,
  'the seed can run repeatedly'
);
select is(
  (select count(*) from public.audit_log),
  (select row_count from audit_count_before_reseed),
  're-seeding creates no duplicate rows or audit writes'
);

select * from finish();
rollback;
