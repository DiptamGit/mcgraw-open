begin;

create or replace function private.expand_2026_group_a_roster()
returns void
language plpgsql
set search_path = pg_catalog, public, private
as $$
declare
  current_group_status text;
begin
  select group_stage_status
  into current_group_status
  from public.tournament_state
  where id = 1
  for update;

  if not found or current_group_status <> 'open' then
    raise exception using
      errcode = 'P0001',
      message = 'GROUP_A_EXPANSION_REQUIRES_OPEN_GROUPS';
  end if;

  lock table public.teams in share row exclusive mode;
  lock table public.matches in share row exclusive mode;

  if exists (
    select 1
    from public.matches
    where stage = 'group'
      and status <> 'unscheduled'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'GROUP_A_EXPANSION_REQUIRES_UNSCHEDULED_GROUPS';
  end if;

  if exists (
    select 1
    from public.matches
    where stage <> 'group'
      and (team1_id is not null or team2_id is not null)
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'GROUP_A_EXPANSION_REQUIRES_UNASSIGNED_KNOCKOUT';
  end if;

  if (select count(*) from public.teams) <> 11
    or (
      select count(*)
      from public.matches
      where stage = 'group'
    ) <> 25
    or (
      select count(*)
      from public.matches
      where stage = 'group' and group_label = 'A'
    ) <> 10
    or (
      select count(*)
      from public.matches
      where stage = 'group' and group_label = 'B'
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
            'a0000001-0000-4000-8000-000000000001'::uuid,
            'Net Results - Ranjit / Venu C',
            'A'
          ),
          (
            'a0000002-0000-4000-8000-000000000002'::uuid,
            'Volley Llamas - Kiran / Venu K',
            'A'
          ),
          (
            'a0000003-0000-4000-8000-000000000003'::uuid,
            'Deuce Detectives - Shishir / Damodhar',
            'A'
          ),
          (
            'a0000004-0000-4000-8000-000000000004'::uuid,
            'Lob Stars - Amit Anand / Kaushtab',
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
    or exists (
      select 1
      from (
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
      ) as expected(id, code, team1_id, team2_id)
      left join public.matches as match on match.id = expected.id
      where match.id is null
        or match.code <> expected.code
        or match.stage <> 'group'
        or match.group_label <> 'A'
        or match.team1_id <> expected.team1_id
        or match.team2_id <> expected.team2_id
        or match.status <> 'unscheduled'
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'GROUP_A_EXPANSION_BASELINE_MISMATCH';
  end if;

  alter table public.teams
    drop constraint teams_final_rank_valid;

  alter table public.teams
    add constraint teams_final_rank_valid check (
      final_rank is null
      or (
        group_label = 'A'
        and final_rank between 1 and 6
      )
      or (
        group_label = 'B'
        and final_rank between 1 and 6
      )
    );

  insert into public.teams (id, name, group_label)
  values (
    'a0000006-0000-4000-8000-000000000006',
    'Fault Tolerant - Shankar / Mohan',
    'A'
  );

  insert into public.matches (
    id,
    code,
    stage,
    group_label,
    team1_id,
    team2_id,
    status
  )
  values
    (
      'a1000000-0000-4000-8000-000000000011',
      'GA-11',
      'group',
      'A',
      'a0000001-0000-4000-8000-000000000001',
      'a0000006-0000-4000-8000-000000000006',
      'unscheduled'
    ),
    (
      'a1000000-0000-4000-8000-000000000012',
      'GA-12',
      'group',
      'A',
      'a0000002-0000-4000-8000-000000000002',
      'a0000006-0000-4000-8000-000000000006',
      'unscheduled'
    ),
    (
      'a1000000-0000-4000-8000-000000000013',
      'GA-13',
      'group',
      'A',
      'a0000003-0000-4000-8000-000000000003',
      'a0000006-0000-4000-8000-000000000006',
      'unscheduled'
    ),
    (
      'a1000000-0000-4000-8000-000000000014',
      'GA-14',
      'group',
      'A',
      'a0000004-0000-4000-8000-000000000004',
      'a0000006-0000-4000-8000-000000000006',
      'unscheduled'
    ),
    (
      'a1000000-0000-4000-8000-000000000015',
      'GA-15',
      'group',
      'A',
      'a0000005-0000-4000-8000-000000000005',
      'a0000006-0000-4000-8000-000000000006',
      'unscheduled'
    );
end;
$$;

revoke all on function private.expand_2026_group_a_roster()
  from public, anon, authenticated, service_role;

select private.expand_2026_group_a_roster();

commit;
