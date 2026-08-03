begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(37);

select has_table('public', 'teams', 'teams table exists');
select has_table('public', 'matches', 'matches table exists');
select has_table(
  'public',
  'tournament_state',
  'tournament state table exists'
);
select has_table('public', 'audit_log', 'audit log table exists');

select is(
  (select group_stage_status from public.tournament_state where id = 1),
  'open',
  'the singleton tournament state starts open'
);

select is(
  (
    select count(*)
    from pg_class
    where oid in (
      'public.teams'::regclass,
      'public.matches'::regclass,
      'public.tournament_state'::regclass,
      'public.audit_log'::regclass,
      'public.organizer_unlock_limits'::regclass
    )
    and relrowsecurity
  ),
  5::bigint,
  'RLS is enabled on every application table'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('teams', 'matches', 'tournament_state')
      and cmd = 'SELECT'
  ),
  3::bigint,
  'public data tables have read-only policies'
);

select ok(
  has_table_privilege('anon', 'public.teams', 'SELECT'),
  'anonymous clients can read teams'
);
select ok(
  has_table_privilege('anon', 'public.matches', 'SELECT'),
  'anonymous clients can read matches'
);
select ok(
  has_table_privilege('anon', 'public.tournament_state', 'SELECT'),
  'anonymous clients can read tournament state'
);
select ok(
  not has_table_privilege('anon', 'public.teams', 'INSERT'),
  'anonymous clients cannot insert teams'
);
select ok(
  not has_table_privilege('anon', 'public.matches', 'UPDATE'),
  'anonymous clients cannot update matches'
);
select ok(
  not has_table_privilege('anon', 'public.matches', 'DELETE'),
  'anonymous clients cannot delete matches'
);
select ok(
  not has_table_privilege('anon', 'public.audit_log', 'SELECT'),
  'anonymous clients cannot read audit records'
);
select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in ('set_updated_at', 'write_audit_log')
      and (
        has_function_privilege('anon', pg_proc.oid, 'EXECUTE')
        or has_function_privilege(
          'authenticated',
          pg_proc.oid,
          'EXECUTE'
        )
      )
  ),
  0::bigint,
  'browser roles cannot execute trigger functions'
);

select throws_ok(
  $$insert into public.teams (name, group_label) values ('Invalid', 'C')$$,
  '23514',
  null,
  'invalid team groups are rejected'
);
select throws_ok(
  $$insert into public.matches (code, stage) values ('BAD-STAGE', 'qualifier')$$,
  '23514',
  null,
  'invalid match stages are rejected'
);
select throws_ok(
  $$insert into public.matches (code, stage, status) values ('BAD-STATUS', 'final', 'pending')$$,
  '23514',
  null,
  'invalid match statuses are rejected'
);
select throws_ok(
  $$insert into public.matches (code, stage, outcome_type) values ('BAD-OUTCOME', 'final', 'abandoned')$$,
  '23514',
  null,
  'invalid outcomes are rejected'
);
select throws_ok(
  $$insert into public.matches (code, stage, deciding_set_format) values ('BAD-FORMAT', 'final', 'short_set')$$,
  '23514',
  null,
  'invalid deciding-set formats are rejected'
);

insert into public.teams (id, name, group_label)
values
  ('11111111-1111-1111-1111-111111111111', 'A One', 'A'),
  ('22222222-2222-2222-2222-222222222222', 'A Two', 'A'),
  ('33333333-3333-3333-3333-333333333333', 'B One', 'B'),
  ('44444444-4444-4444-4444-444444444444', 'B Two', 'B');

select lives_ok(
  $$
    insert into public.matches (
      code,
      stage,
      group_label,
      team1_id,
      team2_id
    )
    values (
      'TEST-GA-01',
      'group',
      'A',
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222'
    )
  $$,
  'a valid group match can be created'
);

select throws_ok(
  $$
    insert into public.matches (
      code,
      stage,
      group_label,
      team1_id,
      team2_id
    )
    values (
      'TEST-GA-02',
      'group',
      'A',
      '22222222-2222-2222-2222-222222222222',
      '11111111-1111-1111-1111-111111111111'
    )
  $$,
  '23505',
  null,
  'a reversed duplicate group pairing is rejected'
);

select throws_ok(
  $$
    insert into public.matches (
      code,
      stage,
      team1_id,
      team2_id,
      status
    )
    values (
      'QF9',
      'quarterfinal',
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      'scheduled'
    )
  $$,
  '23514',
  null,
  'a scheduled match requires a schedule timestamp'
);

select throws_ok(
  $$
    insert into public.matches (
      code,
      stage,
      team1_id,
      team2_id,
      status
    )
    values (
      'QF8',
      'quarterfinal',
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      'completed'
    )
  $$,
  '23514',
  null,
  'a completed match requires result fields'
);

select throws_ok(
  $$
    insert into public.matches (
      code,
      stage,
      team1_id,
      team2_id,
      winner_id
    )
    values (
      'QF7',
      'quarterfinal',
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      '11111111-1111-1111-1111-111111111111'
    )
  $$,
  '23514',
  null,
  'a non-completed match cannot retain stale result data'
);

select lives_ok(
  $$
    insert into public.matches (
      code,
      stage,
      team1_id,
      team2_id,
      status,
      deciding_set_format,
      outcome_type,
      sets,
      winner_id,
      played_at,
      completed_at
    )
    values (
      'TEST-QF1',
      'quarterfinal',
      '33333333-3333-3333-3333-333333333333',
      '44444444-4444-4444-4444-444444444444',
      'completed',
      'full_set',
      'normal',
      '[[6, 4], [6, 4]]'::jsonb,
      '33333333-3333-3333-3333-333333333333',
      statement_timestamp() - interval '1 day',
      statement_timestamp()
    )
  $$,
  'a consistent normal result can be created'
);

select ok(
  exists (
    select 1
    from public.audit_log
    where entity_type = 'matches'
      and entity_key = 'TEST-QF1'
      and action = 'insert'
      and before_data is null
      and after_data is not null
  ),
  'match inserts are audited with an after snapshot'
);

select lives_ok(
  $$
    update public.matches
    set label = 'Opening match'
    where code = 'TEST-GA-01'
  $$,
  'matches can be updated'
);

select ok(
  (
    select updated_at > created_at
    from public.matches
    where code = 'TEST-GA-01'
  ),
  'match updates advance updated_at'
);

select ok(
  exists (
    select 1
    from public.audit_log
    where entity_type = 'matches'
      and entity_key = 'TEST-GA-01'
      and action = 'update'
      and before_data is not null
      and after_data is not null
  ),
  'match updates are audited with before and after snapshots'
);

update public.teams
set final_rank = 1
where id = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  $$
    update public.teams
    set final_rank = 1
    where id = '22222222-2222-2222-2222-222222222222'
  $$,
  '23505',
  null,
  'final ranks are unique within a group'
);

select throws_ok(
  $$
    insert into public.matches (
      code,
      stage,
      group_label,
      team1_id,
      team2_id
    )
    values (
      'TEST-GA-03',
      'group',
      'A',
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333'
    )
  $$,
  '23503',
  null,
  'group participants must belong to the match group'
);

select throws_ok(
  $$
    insert into public.matches (
      code,
      stage,
      team1_id,
      team2_id,
      status,
      outcome_type,
      sets,
      winner_id,
      played_at,
      completed_at
    )
    values (
      'TEST-QF2',
      'quarterfinal',
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      'completed',
      'walkover',
      '[[6, 0]]'::jsonb,
      '11111111-1111-1111-1111-111111111111',
      statement_timestamp() - interval '1 day',
      statement_timestamp()
    )
  $$,
  '23514',
  null,
  'walkovers cannot retain a fabricated score'
);

select is(
  (
    select count(*)
    from public.audit_log
    where entity_type = 'matches'
      and entity_key = 'TEST-QF2'
  ),
  0::bigint,
  'failed mutations do not leave audit records'
);

select lives_ok(
  $$
    insert into public.matches (
      code,
      stage,
      team1_id,
      team2_id,
      status,
      outcome_type,
      winner_id,
      played_at,
      completed_at
    )
    values (
      'TEST-QF3',
      'quarterfinal',
      '22222222-2222-2222-2222-222222222222',
      '44444444-4444-4444-4444-444444444444',
      'completed',
      'walkover',
      '22222222-2222-2222-2222-222222222222',
      statement_timestamp() - interval '1 day',
      statement_timestamp()
    )
  $$,
  'a walkover can be stored without a score'
);

select lives_ok(
  $$
    insert into public.matches (
      code,
      stage,
      team1_id,
      team2_id,
      status,
      deciding_set_format,
      outcome_type,
      winner_id,
      played_at,
      completed_at
    )
    values (
      'TEST-SF1',
      'semifinal',
      '11111111-1111-1111-1111-111111111111',
      '44444444-4444-4444-4444-444444444444',
      'completed',
      'match_tiebreak',
      'retirement',
      '11111111-1111-1111-1111-111111111111',
      statement_timestamp() - interval '1 day',
      statement_timestamp()
    )
  $$,
  'a retirement can be stored without a partial score'
);

select throws_ok(
  $$
    insert into public.matches (
      code,
      stage,
      team1_id,
      team2_id,
      status,
      deciding_set_format,
      outcome_type,
      sets,
      winner_id,
      played_at,
      completed_at
    )
    values (
      'TEST-FINAL',
      'final',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333',
      'completed',
      'full_set',
      'normal',
      '[[6, 4], [6, 4]]'::jsonb,
      '22222222-2222-2222-2222-222222222222',
      statement_timestamp(),
      statement_timestamp() - interval '1 day'
    )
  $$,
  '23514',
  null,
  'result entry time cannot precede the played time'
);

select * from finish();
rollback;
