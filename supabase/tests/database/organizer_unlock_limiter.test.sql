begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

select has_table(
  'public',
  'organizer_unlock_limits',
  'organizer unlock limits table exists'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.organizer_unlock_limits'::regclass
  ),
  'organizer unlock limits have RLS enabled'
);
select ok(
  not has_table_privilege(
    'anon',
    'public.organizer_unlock_limits',
    'SELECT'
  ),
  'anonymous clients cannot read limiter state'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.record_organizer_unlock_attempt(text, boolean)',
    'EXECUTE'
  ),
  'anonymous clients cannot execute the limiter'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.record_organizer_unlock_attempt(text, boolean)',
    'EXECUTE'
  ),
  'authenticated clients cannot execute the limiter'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.record_organizer_unlock_attempt(text, boolean)',
    'EXECUTE'
  ),
  'the service role can execute the limiter'
);

select is(
  (
    select allowed
    from public.record_organizer_unlock_attempt(repeat('a', 64), false)
  ),
  true,
  'the first failed attempt remains below the limit'
);

do $$
begin
  perform public.record_organizer_unlock_attempt(repeat('a', 64), false);
  perform public.record_organizer_unlock_attempt(repeat('a', 64), false);
  perform public.record_organizer_unlock_attempt(repeat('a', 64), false);
  perform public.record_organizer_unlock_attempt(repeat('a', 64), false);
end;
$$;

select is(
  (
    select failure_count
    from public.organizer_unlock_limits
    where client_key = repeat('a', 64)
  ),
  5::smallint,
  'five failures are counted in one window'
);
select is(
  (
    select allowed
    from public.record_organizer_unlock_attempt(repeat('a', 64), false)
  ),
  false,
  'the sixth attempt is rate limited'
);
select ok(
  (
    select retry_after_seconds between 1 and 900
    from public.record_organizer_unlock_attempt(repeat('a', 64), false)
  ),
  'a limited attempt returns a bounded retry time'
);
select is(
  (
    select allowed
    from public.record_organizer_unlock_attempt(repeat('b', 64), false)
  ),
  true,
  'a different client keeps an independent limit'
);

do $$
begin
  perform public.record_organizer_unlock_attempt(repeat('c', 64), false);
  perform public.record_organizer_unlock_attempt(repeat('c', 64), true);
end;
$$;

select is(
  (
    select count(*)
    from public.organizer_unlock_limits
    where client_key = repeat('c', 64)
  ),
  0::bigint,
  'a successful attempt clears prior failures'
);
select throws_ok(
  $$
    select *
    from public.record_organizer_unlock_attempt('raw-client-value', false)
  $$,
  '22023',
  'Invalid organizer unlock client key',
  'non-HMAC client keys are rejected'
);

select * from finish();
rollback;
