begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(32);

select ok(not has_function_privilege('anon', 'public.reconcile_2026_knockout(jsonb)', 'execute'),
  'anonymous clients cannot reconcile');
select ok(not has_function_privilege('authenticated', 'public.reconcile_2026_knockout(jsonb)', 'execute'),
  'authenticated clients cannot reconcile');
select ok(has_function_privilege('service_role', 'public.reconcile_2026_knockout(jsonb)', 'execute'),
  'service role can reconcile behind the authorized route');
select is(private.knockout_2026_source('SF1', 'team1_id'), 'QF4', 'SF1 first source is QF4');
select is(private.knockout_2026_source('SF1', 'team2_id'), 'QF1', 'SF1 second source is QF1');
select is(private.knockout_2026_source('SF2', 'team2_id'), 'QF2', 'SF2 second source is QF2');

select throws_ok(
  $$select public.reconcile_2026_knockout('{}')$$,
  'P0001', 'RECONCILIATION_CONFLICT', 'unexpected snapshot is rejected');
select throws_ok(
  $$select public.reconcile_2026_knockout(public.get_tournament_snapshot())$$,
  'P0001', 'RECONCILIATION_BASELINE_INVALID', 'incomplete groups are rejected');

-- Synthetic isolated results, not production data or credentials.
update public.matches set
  status = 'completed', outcome_type = 'normal', deciding_set_format = 'full_set',
  sets = '[[6,4],[6,4]]', winner_id = team1_id,
  played_at = '2026-10-01T23:00:00Z', completed_at = statement_timestamp()
where stage = 'group';

create temporary table reviewed as select public.get_tournament_snapshot() as snapshot;
create temporary table groups_before as
  select jsonb_agg(to_jsonb(match) order by id) as rows from public.matches as match where stage = 'group';
create temporary table final_before as select to_jsonb(match) as row from public.matches as match where code = 'Final';
create temporary table audit_start as select max(id) as id from public.audit_log;

update public.matches set venue = 'Changed venue', scheduled_at = played_at where code = 'GA-01';
select throws_ok(
  $$select public.reconcile_2026_knockout((select snapshot from reviewed))$$,
  'P0001', 'RECONCILIATION_CONFLICT', 'a changed match invalidates the reviewed snapshot');
select is((select count(*)::integer from public.teams where final_rank is not null), 0,
  'conflict does not partially finalize');
update public.matches set venue = null, scheduled_at = null where code = 'GA-01';
update groups_before set rows = (
  select jsonb_agg(to_jsonb(match) order by id) from public.matches as match where stage = 'group'
);
update reviewed set snapshot = public.get_tournament_snapshot();

savepoint invalid_identity;
update public.teams set name = 'Unexpected roster' where id = 'a0000001-0000-4000-8000-000000000001';
select throws_ok(
  $$select public.reconcile_2026_knockout(public.get_tournament_snapshot())$$,
  'P0001', 'RECONCILIATION_IDENTITIES_INVALID', 'a renamed identity is rejected');
rollback to invalid_identity;

savepoint active_knockout;
update public.matches set team1_id = 'a0000001-0000-4000-8000-000000000001' where code = 'QF1';
select throws_ok(
  $$select public.reconcile_2026_knockout(public.get_tournament_snapshot())$$,
  'P0001', 'RECONCILIATION_BASELINE_INVALID', 'existing assignments are protected');
rollback to active_knockout;

-- Force a late failure to prove row changes, finalization, and audits roll back.
create function pg_temp.reject_semifinal_label() returns trigger language plpgsql as $$
begin
  if new.code = 'SF2' and new.label is distinct from old.label then
    raise exception using errcode = 'P0001', message = 'TEST_LATE_FAILURE';
  end if;
  return new;
end;
$$;
create trigger test_late_reconciliation_failure before update on public.matches
for each row execute function pg_temp.reject_semifinal_label();
select throws_ok(
  $$select public.reconcile_2026_knockout(public.get_tournament_snapshot())$$,
  'P0001', 'TEST_LATE_FAILURE', 'late failure aborts the entire operation');
select is(public.get_tournament_snapshot(), (select snapshot from reviewed),
  'late failure preserves every team, match, and state row');
select is((select count(*)::integer from public.audit_log where entity_key = 'MGO-033'), 0,
  'late failure leaves no reconciliation audit');
drop trigger test_late_reconciliation_failure on public.matches;
update audit_start set id = (select max(id) from public.audit_log);

select lives_ok(
  $$select public.reconcile_2026_knockout((select snapshot from reviewed))$$,
  'reviewed reconciliation succeeds atomically');
select is((select jsonb_agg(to_jsonb(match) order by id) from public.matches as match where stage = 'group'),
  (select rows from groups_before), 'all 30 full group rows are unchanged');
select is((select to_jsonb(match) from public.matches as match where code = 'Final'),
  (select row from final_before), 'the complete Final row is unchanged');
select is((select name from public.teams where id = 'b0000005-0000-4000-8000-000000000005'),
  'Rally Rascals - Withdrawn', 'Rally Rascals identity is retained and marked withdrawn');
select is((select name from public.teams where id = 'b0000006-0000-4000-8000-000000000006'),
  'Racquet Scientists - Withdrawn', 'Racquet Scientists identity is retained and marked withdrawn');
select is((select group_stage_status from public.tournament_state), 'finalized', 'groups are locked');
select is((select tie_resolution_note from public.tournament_state), null::text,
  'the organizer ruling is not mislabeled as an automatic tie');
select is((select array_agg(split_part(name, ' - ', 1) order by final_rank) from public.teams where group_label = 'B'),
  array['Drop Shot Society', 'Spin Doctors', 'Baseline Bandits', 'Court Jesters', 'Rally Rascals', 'Racquet Scientists'],
  'the exact official Group B ranks override computed eligibility/order');
select is((select array_agg(sets order by code) from public.matches where stage = 'quarterfinal'),
  array['[[6,4],[2,6],[2,6]]'::jsonb, '[[6,7],[6,7]]'::jsonb, '[[6,1],[7,6]]'::jsonb, '[[3,6],[2,6]]'::jsonb],
  'all four QF scores use the stored team-side orientation');
select is((select count(*)::integer from public.matches where stage = 'quarterfinal'
  and status = 'completed' and outcome_type = 'normal' and deciding_set_format = 'full_set'
  and venue = 'BHS' and scheduled_at = played_at and completed_at >= played_at
  and played_at = case code when 'QF4' then '2026-10-14T22:00:00Z'::timestamptz
    else '2026-10-13T23:00:00Z'::timestamptz end), 4,
  'all QF dates, BHS venue, administrative schedule, and entry timestamps are valid');
select is((select array_agg(team1_id::text || '/' || team2_id::text order by code)
  from public.matches where stage = 'semifinal'),
  array[
    'b0000004-0000-4000-8000-000000000004/b0000002-0000-4000-8000-000000000002',
    'a0000001-0000-4000-8000-000000000001/b0000001-0000-4000-8000-000000000001'
  ], 'semifinals contain seeds 1/4 and 2/3 in the approved slots');
select is((select count(*)::integer from public.matches where stage = 'semifinal'
  and status = 'unscheduled' and scheduled_at is null and venue is null and sets is null),
  2, 'semifinals remain unscheduled without fabricated results');
select is((select count(*)::integer from public.audit_log where entity_type = 'tournament_reconciliation'
  and entity_key = 'MGO-033' and after_data -> 'tiebreak_points_winner_first' is not null),
  1, 'one reconciliation audit preserves the ruling and raw tiebreak evidence');
select is((select count(*)::integer from public.audit_log where id > (select id from audit_start)
  and entity_type = 'matches' and after_data ->> 'stage' = 'group'), 0,
  'the operation creates no group-match update audits');
select throws_ok(
  $$update public.matches set played_at = played_at - interval '1 minute' where code = 'QF4'$$,
  'P0001', 'UPSTREAM_RESULT_LOCKED', 'QF4 is locked by its SF1 slot');
select throws_ok(
  $$select public.reconcile_2026_knockout((select snapshot from reviewed))$$,
  'P0001', 'RECONCILIATION_ALREADY_APPLIED', 'repeated reconciliation is explicitly rejected');
select is((select count(*)::integer from public.audit_log where entity_type = 'tournament_reconciliation'
  and entity_key = 'MGO-033'), 1, 'a repeat creates no duplicate audit');

select * from finish();
rollback;
