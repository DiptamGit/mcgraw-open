begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(18);

select ok(
  to_regprocedure('private.update_2026_group_a_roster()') is not null,
  'the guarded Group A roster update helper exists'
);
select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'private'
      and pg_proc.proname = 'update_2026_group_a_roster'
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
  'application roles cannot execute the roster update helper'
);
select ok(
  exists (
    select 1
    from public.teams
    where id = 'a0000003-0000-4000-8000-000000000003'
      and name = 'Deuce Detectives - Anindya / Damodhar'
      and group_label = 'A'
  ),
  'Deuce Detectives keeps its stable identity with the replacement player'
);
select ok(
  exists (
    select 1
    from public.teams
    where id = 'a0000005-0000-4000-8000-000000000005'
      and name = 'Smash Potatoes - Withdrawn'
      and group_label = 'A'
  ),
  'Smash Potatoes keeps its stable identity and shows its withdrawal'
);
select is(
  (select count(*) from public.teams),
  12::bigint,
  'the roster still contains twelve teams'
);
select is(
  (select count(*) from public.matches),
  37::bigint,
  'the tournament still contains thirty-seven matches'
);
select is(
  (select count(*) from public.matches where stage = 'group'),
  30::bigint,
  'the tournament still contains thirty group matches'
);
select is(
  (
    select count(*)
    from public.matches
    where code in ('GA-04', 'GA-07', 'GA-09', 'GA-10', 'GA-15')
      and (
        team1_id = 'a0000005-0000-4000-8000-000000000005'
        or team2_id = 'a0000005-0000-4000-8000-000000000005'
      )
  ),
  5::bigint,
  'all five stable Smash Potatoes fixtures remain present'
);
select is(
  (
    select count(*)
    from public.audit_log
    where action = 'update'
      and entity_type = 'matches'
  ),
  0::bigint,
  'the roster migration creates no match update audit'
);
select is(
  (
    select count(*)
    from public.audit_log
    where action = 'update'
      and entity_type = 'teams'
      and entity_key = 'a0000003-0000-4000-8000-000000000003'
      and before_data ->> 'name'
        = 'Deuce Detectives - Shishir / Damodhar'
      and after_data ->> 'name'
        = 'Deuce Detectives - Anindya / Damodhar'
  ),
  1::bigint,
  'the Deuce Detectives rename has one before-and-after audit entry'
);
select is(
  (
    select count(*)
    from public.audit_log
    where action = 'update'
      and entity_type = 'teams'
      and entity_key = 'a0000005-0000-4000-8000-000000000005'
      and before_data ->> 'name' = 'Smash Potatoes - Ariya / Anindya'
      and after_data ->> 'name' = 'Smash Potatoes - Withdrawn'
  ),
  1::bigint,
  'the Smash Potatoes rename has one before-and-after audit entry'
);
select ok(
  exists (
    select 1
    from jsonb_array_elements(
      public.get_tournament_snapshot() -> 'teams'
    ) as team
    where team ->> 'id' = 'a0000003-0000-4000-8000-000000000003'
      and team ->> 'name' = 'Deuce Detectives - Anindya / Damodhar'
  ),
  'the public snapshot exposes the updated Deuce Detectives name'
);
select ok(
  exists (
    select 1
    from jsonb_array_elements(
      public.get_tournament_snapshot() -> 'teams'
    ) as team
    where team ->> 'id' = 'a0000005-0000-4000-8000-000000000005'
      and team ->> 'name' = 'Smash Potatoes - Withdrawn'
  ),
  'the public snapshot exposes the Smash Potatoes withdrawal'
);

update public.teams
set name = case id
  when 'a0000003-0000-4000-8000-000000000003'::uuid
    then 'Deuce Detectives - Shishir / Damodhar'
  when 'a0000005-0000-4000-8000-000000000005'::uuid
    then 'Smash Potatoes - Ariya / Anindya'
end
where id in (
  'a0000003-0000-4000-8000-000000000003'::uuid,
  'a0000005-0000-4000-8000-000000000005'::uuid
);

update public.matches
set
  status = 'completed',
  deciding_set_format = 'full_set',
  outcome_type = 'normal',
  sets = '[[7, 5], [6, 2]]'::jsonb,
  winner_id = 'a0000001-0000-4000-8000-000000000001',
  played_at = '2026-08-28 23:30:00+00'::timestamptz,
  completed_at = '2026-08-29 01:40:49+00'::timestamptz
where code = 'GA-04';

update public.matches
set
  status = 'completed',
  deciding_set_format = null,
  outcome_type = 'walkover',
  sets = null,
  winner_id = 'a0000002-0000-4000-8000-000000000002',
  played_at = '2026-09-26 23:30:00+00'::timestamptz,
  completed_at = '2026-09-28 18:31:42+00'::timestamptz
where code = 'GA-07';

create temporary table roster_match_snapshot_before as
select coalesce(
  jsonb_agg(to_jsonb(match) order by match.id),
  '[]'::jsonb
) as snapshot
from public.matches as match;

select lives_ok(
  $$select private.update_2026_group_a_roster()$$,
  'the roster update accepts existing normal scores and walkovers'
);
select is(
  (
    select coalesce(
      jsonb_agg(to_jsonb(match) order by match.id),
      '[]'::jsonb
    )
    from public.matches as match
  ),
  (select snapshot from roster_match_snapshot_before),
  'the roster update preserves every field of every match'
);
select is(
  (
    select jsonb_object_agg(id, name order by id)
    from public.teams
    where id in (
      'a0000003-0000-4000-8000-000000000003'::uuid,
      'a0000005-0000-4000-8000-000000000005'::uuid
    )
  ),
  '{
    "a0000003-0000-4000-8000-000000000003":
      "Deuce Detectives - Anindya / Damodhar",
    "a0000005-0000-4000-8000-000000000005":
      "Smash Potatoes - Withdrawn"
  }'::jsonb,
  'the guarded helper updates exactly the two selected names'
);

update public.teams
set name = 'Smash Potatoes - Ariya / Anindya'
where id = 'a0000005-0000-4000-8000-000000000005';

select throws_ok(
  $$select private.update_2026_group_a_roster()$$,
  'P0001',
  'GROUP_A_ROSTER_UPDATE_BASELINE_MISMATCH',
  'the roster update rejects an unexpected mixed baseline'
);
select is(
  (
    select jsonb_object_agg(id, name order by id)
    from public.teams
    where id in (
      'a0000003-0000-4000-8000-000000000003'::uuid,
      'a0000005-0000-4000-8000-000000000005'::uuid
    )
  ),
  '{
    "a0000003-0000-4000-8000-000000000003":
      "Deuce Detectives - Anindya / Damodhar",
    "a0000005-0000-4000-8000-000000000005":
      "Smash Potatoes - Ariya / Anindya"
  }'::jsonb,
  'the rejected roster update changes no team data'
);

select * from finish();
rollback;
