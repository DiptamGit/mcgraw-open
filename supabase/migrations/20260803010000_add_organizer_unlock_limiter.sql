create table public.organizer_unlock_limits (
  client_key text primary key,
  window_started_at timestamptz not null default statement_timestamp(),
  failure_count smallint not null default 1,
  updated_at timestamptz not null default statement_timestamp(),
  constraint organizer_unlock_limits_client_key_valid check (
    client_key ~ '^[0-9a-f]{64}$'
  ),
  constraint organizer_unlock_limits_failure_count_valid check (
    failure_count between 1 and 5
  )
);

create index organizer_unlock_limits_window_started_idx
  on public.organizer_unlock_limits (window_started_at);

alter table public.organizer_unlock_limits enable row level security;

revoke all on table public.organizer_unlock_limits
  from public, anon, authenticated;

create or replace function public.record_organizer_unlock_attempt(
  p_client_key text,
  p_was_successful boolean
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_limit public.organizer_unlock_limits%rowtype;
  v_now timestamptz := statement_timestamp();
  window_length constant interval := interval '15 minutes';
begin
  if p_client_key is null or p_client_key !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid organizer unlock client key'
      using errcode = '22023';
  end if;

  if p_was_successful is null then
    raise exception 'Organizer unlock outcome is required'
      using errcode = '22004';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_client_key, 0)
  );

  delete from public.organizer_unlock_limits
  where window_started_at <= v_now - window_length;

  select *
  into current_limit
  from public.organizer_unlock_limits
  where client_key = p_client_key
  for update;

  if found and current_limit.failure_count >= 5 then
    return query
    select
      false,
      greatest(
        1,
        ceil(
          extract(
            epoch from (
              current_limit.window_started_at
              + window_length
              - v_now
            )
          )
        )::integer
      );
    return;
  end if;

  if p_was_successful then
    delete from public.organizer_unlock_limits
    where client_key = p_client_key;
  elsif found then
    update public.organizer_unlock_limits
    set
      failure_count = failure_count + 1,
      updated_at = v_now
    where client_key = p_client_key;
  else
    insert into public.organizer_unlock_limits (
      client_key,
      window_started_at,
      failure_count,
      updated_at
    )
    values (
      p_client_key,
      v_now,
      1,
      v_now
    );
  end if;

  return query select true, 0;
end;
$$;

revoke all on function public.record_organizer_unlock_attempt(text, boolean)
  from public, anon, authenticated;

grant execute
  on function public.record_organizer_unlock_attempt(text, boolean)
  to service_role;
