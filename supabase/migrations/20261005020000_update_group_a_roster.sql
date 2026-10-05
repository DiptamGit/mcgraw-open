begin;

create or replace function private.update_2026_group_a_roster()
returns void
language plpgsql
set search_path = pg_catalog, public, private
as $$
declare
  matches_before jsonb;
  matches_after jsonb;
  updated_team_count integer;
begin
  lock table public.teams in share row exclusive mode;
  lock table public.matches in share row exclusive mode;

  if (select count(*) from public.teams) <> 12
    or (select count(*) from public.matches) <> 37
    or (
      select count(*)
      from public.matches
      where stage = 'group'
    ) <> 30
    or (
      select count(*)
      from public.matches
      where stage = 'group' and group_label = 'A'
    ) <> 15
    or (
      select count(*)
      from public.matches
      where stage <> 'group'
    ) <> 7
    or exists (
      select 1
      from (
        values
          (
            'a0000003-0000-4000-8000-000000000003'::uuid,
            'Deuce Detectives - Shishir / Damodhar',
            'A'
          ),
          (
            'a0000005-0000-4000-8000-000000000005'::uuid,
            'Smash Potatoes - Ariya / Anindya',
            'A'
          )
      ) as expected(id, name, group_label)
      left join public.teams as team on team.id = expected.id
      where team.id is null
        or team.name <> expected.name
        or team.group_label <> expected.group_label
    )
    or (
      select count(*)
      from (
        values
          (
            'a1000000-0000-4000-8000-000000000004'::uuid,
            'GA-04',
            'a0000001-0000-4000-8000-000000000001'::uuid,
            'a0000005-0000-4000-8000-000000000005'::uuid
          ),
          (
            'a1000000-0000-4000-8000-000000000007'::uuid,
            'GA-07',
            'a0000002-0000-4000-8000-000000000002'::uuid,
            'a0000005-0000-4000-8000-000000000005'::uuid
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
          ),
          (
            'a1000000-0000-4000-8000-000000000015'::uuid,
            'GA-15',
            'a0000005-0000-4000-8000-000000000005'::uuid,
            'a0000006-0000-4000-8000-000000000006'::uuid
          )
      ) as expected(id, code, team1_id, team2_id)
      join public.matches as match
        on match.id = expected.id
        and match.code = expected.code
        and match.stage = 'group'
        and match.group_label = 'A'
        and match.team1_id = expected.team1_id
        and match.team2_id = expected.team2_id
    ) <> 5
  then
    raise exception using
      errcode = 'P0001',
      message = 'GROUP_A_ROSTER_UPDATE_BASELINE_MISMATCH';
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(match) order by match.id),
    '[]'::jsonb
  )
  into matches_before
  from public.matches as match;

  update public.teams
  set name = case id
    when 'a0000003-0000-4000-8000-000000000003'::uuid
      then 'Deuce Detectives - Anindya / Damodhar'
    when 'a0000005-0000-4000-8000-000000000005'::uuid
      then 'Smash Potatoes - Withdrawn'
  end
  where id in (
    'a0000003-0000-4000-8000-000000000003'::uuid,
    'a0000005-0000-4000-8000-000000000005'::uuid
  );

  get diagnostics updated_team_count = row_count;

  if updated_team_count <> 2 then
    raise exception using
      errcode = 'P0001',
      message = 'GROUP_A_ROSTER_UPDATE_COUNT_MISMATCH';
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(match) order by match.id),
    '[]'::jsonb
  )
  into matches_after
  from public.matches as match;

  if matches_after is distinct from matches_before then
    raise exception using
      errcode = 'P0001',
      message = 'GROUP_A_ROSTER_UPDATE_CHANGED_MATCHES';
  end if;
end;
$$;

revoke all on function private.update_2026_group_a_roster()
  from public, anon, authenticated, service_role;

select private.update_2026_group_a_roster();

commit;
