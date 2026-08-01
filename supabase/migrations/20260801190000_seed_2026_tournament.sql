create schema if not exists private;

revoke all on schema private from public, anon, authenticated, service_role;

create or replace function private.seed_2026_tournament()
returns void
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  insert into public.tournament_state (id)
  values (1)
  on conflict (id) do nothing;

  insert into public.teams (id, name, group_label)
  values
    (
      'a0000001-0000-4000-8000-000000000001',
      'Net Results - Ranjit / Venu C',
      'A'
    ),
    (
      'a0000002-0000-4000-8000-000000000002',
      'Volley Llamas - Kiran / Venu K',
      'A'
    ),
    (
      'a0000003-0000-4000-8000-000000000003',
      'Deuce Detectives - Shishir / Damodhar',
      'A'
    ),
    (
      'a0000004-0000-4000-8000-000000000004',
      'Lob Stars - Amit Anand / Kaushtab',
      'A'
    ),
    (
      'a0000005-0000-4000-8000-000000000005',
      'Smash Potatoes - Ariya / Anindya',
      'A'
    ),
    (
      'b0000001-0000-4000-8000-000000000001',
      'Baseline Bandits - Prasad V / Srinivas',
      'B'
    ),
    (
      'b0000002-0000-4000-8000-000000000002',
      'Court Jesters - Amit Gupta / Jeet',
      'B'
    ),
    (
      'b0000003-0000-4000-8000-000000000003',
      'Spin Doctors - Nil / Kaushik',
      'B'
    ),
    (
      'b0000004-0000-4000-8000-000000000004',
      'Drop Shot Society - Giri / Srini',
      'B'
    ),
    (
      'b0000005-0000-4000-8000-000000000005',
      'Rally Rascals - Arup / Diptam',
      'B'
    ),
    (
      'b0000006-0000-4000-8000-000000000006',
      'Racquet Scientists - Venkat Goli / Bhavanth',
      'B'
    )
  on conflict (id) do nothing;

  with seeded_teams (id, group_label, seed_number) as (
    values
      ('a0000001-0000-4000-8000-000000000001'::uuid, 'A', 1),
      ('a0000002-0000-4000-8000-000000000002'::uuid, 'A', 2),
      ('a0000003-0000-4000-8000-000000000003'::uuid, 'A', 3),
      ('a0000004-0000-4000-8000-000000000004'::uuid, 'A', 4),
      ('a0000005-0000-4000-8000-000000000005'::uuid, 'A', 5),
      ('b0000001-0000-4000-8000-000000000001'::uuid, 'B', 1),
      ('b0000002-0000-4000-8000-000000000002'::uuid, 'B', 2),
      ('b0000003-0000-4000-8000-000000000003'::uuid, 'B', 3),
      ('b0000004-0000-4000-8000-000000000004'::uuid, 'B', 4),
      ('b0000005-0000-4000-8000-000000000005'::uuid, 'B', 5),
      ('b0000006-0000-4000-8000-000000000006'::uuid, 'B', 6)
  ),
  group_pairings as (
    select
      team1.group_label,
      team1.id as team1_id,
      team2.id as team2_id,
      row_number() over (
        partition by team1.group_label
        order by team1.seed_number, team2.seed_number
      ) as pairing_number
    from seeded_teams team1
    join seeded_teams team2
      on team2.group_label = team1.group_label
      and team2.seed_number > team1.seed_number
  )
  insert into public.matches (
    id,
    code,
    stage,
    group_label,
    team1_id,
    team2_id
  )
  select
    (
      lower(group_label)
      || '1000000-0000-4000-8000-'
      || lpad(pairing_number::text, 12, '0')
    )::uuid,
    'G' || group_label || '-' || lpad(pairing_number::text, 2, '0'),
    'group',
    group_label,
    team1_id,
    team2_id
  from group_pairings
  order by group_label, pairing_number
  on conflict (code) do nothing;

  insert into public.matches (id, code, stage, label)
  values
    (
      'c1000000-0000-4000-8000-000000000001',
      'QF1',
      'quarterfinal',
      'QF1: A1 vs B4'
    ),
    (
      'c1000000-0000-4000-8000-000000000002',
      'QF2',
      'quarterfinal',
      'QF2: A2 vs B3'
    ),
    (
      'c1000000-0000-4000-8000-000000000003',
      'QF3',
      'quarterfinal',
      'QF3: A3 vs B2'
    ),
    (
      'c1000000-0000-4000-8000-000000000004',
      'QF4',
      'quarterfinal',
      'QF4: A4 vs B1'
    ),
    (
      'c1000000-0000-4000-8000-000000000005',
      'SF1',
      'semifinal',
      'SF1: Winner QF1 vs Winner QF2'
    ),
    (
      'c1000000-0000-4000-8000-000000000006',
      'SF2',
      'semifinal',
      'SF2: Winner QF3 vs Winner QF4'
    ),
    (
      'c1000000-0000-4000-8000-000000000007',
      'Final',
      'final',
      'Final: Winner SF1 vs Winner SF2'
    )
  on conflict (code) do nothing;
end;
$$;

revoke all on function private.seed_2026_tournament()
  from public, anon, authenticated, service_role;

select private.seed_2026_tournament();
