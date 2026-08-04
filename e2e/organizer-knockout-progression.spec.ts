import { expect, test } from "@playwright/test";

import {
  executeLocalSql,
  queryLocalSql,
  resetLocalSupabaseDatabase,
} from "./support/local-supabase";
import {
  expectNoHorizontalPageOverflow,
  unlockOrganizerMode,
} from "./support/organizer";

const COMPLETED_QUARTERFINALS_SQL = `
begin;

update public.matches
set
  team1_id = (
    select id from public.teams order by id limit 1 offset 0
  ),
  team2_id = (
    select id from public.teams order by id limit 1 offset 1
  )
where code = 'QF1';

update public.matches
set
  team1_id = (
    select id from public.teams order by id limit 1 offset 2
  ),
  team2_id = (
    select id from public.teams order by id limit 1 offset 3
  )
where code = 'QF2';

update public.matches
set
  status = 'completed',
  deciding_set_format = 'full_set',
  outcome_type = 'normal',
  sets = '[[6, 4], [6, 4]]'::jsonb,
  winner_id = team1_id,
  played_at = statement_timestamp() - interval '1 day',
  completed_at = statement_timestamp()
where code in ('QF1', 'QF2');

commit;
`;

test("assigns, locks, and clears a semifinal progression path", async (
  { page },
  testInfo,
) => {
  executeLocalSql(COMPLETED_QUARTERFINALS_SQL);

  try {
    await unlockOrganizerMode(page);
    if (testInfo.project.name === "android-chrome") {
      await page.setViewportSize({ width: 320, height: 740 });
    }

    await page.goto("/bracket");
    await page.getByRole("link", { name: "Manage SF1 teams" }).click();

    await expect(
      page.getByRole("heading", { name: "Manage SF1 teams" }),
    ).toBeVisible();
    const qf1Path = page.getByRole("region", {
      name: "Winner QF1 → SF1",
    });
    await expect(qf1Path).toContainText("Ready to assign");
    await expect(qf1Path.getByRole("radio")).toBeChecked();
    await expectNoHorizontalPageOverflow(page);
    expect(
      (await qf1Path.locator("label").first().boundingBox())?.height ?? 0,
    ).toBeGreaterThanOrEqual(44);
    expect(
      (
        await qf1Path
          .getByRole("button", { name: "Review assignment" })
          .boundingBox()
      )?.height ?? 0,
    ).toBeGreaterThanOrEqual(44);

    await qf1Path
      .getByRole("button", { name: "Review assignment" })
      .click();
    await expect(
      qf1Path.getByRole("button", { name: "Keep bracket unchanged" }),
    ).toBeFocused();
    await qf1Path
      .getByRole("button", { name: "Keep bracket unchanged" })
      .click();
    await expect(
      qf1Path.getByRole("button", { name: "Review assignment" }),
    ).toBeFocused();
    await qf1Path
      .getByRole("button", { name: "Review assignment" })
      .click();
    await qf1Path
      .getByRole("group", { name: "Confirm SF1 assignment" })
      .getByRole("button", { name: "Assign winner" })
      .click();

    await expect(page).toHaveURL(
      /\/bracket\?progression=assigned&match=SF1$/,
    );
    await expect(page.locator(".form-feedback--success")).toContainText(
      "source result is now locked",
    );
    expect(
      queryLocalSql(`
        select sf.team1_id = qf.winner_id
        from public.matches as sf
        cross join public.matches as qf
        where sf.code = 'SF1' and qf.code = 'QF1';
      `),
    ).toBe("t");

    await page.goto("/matches/QF1/result");
    await expect(
      page.getByRole("heading", { name: "Result locked" }),
    ).toBeVisible();
    await expect(page.getByText(/assigned to SF1/)).toBeVisible();

    await page.goto("/bracket/SF1/assignment");
    const assignedQf1Path = page.getByRole("region", {
      name: "Winner QF1 → SF1",
    });
    await expect(assignedQf1Path).toContainText("Assigned");
    await assignedQf1Path
      .getByRole("button", { name: "Clear assignment" })
      .click();
    await assignedQf1Path
      .getByRole("group", { name: "Confirm clear SF1 assignment" })
      .getByRole("button", { name: "Clear assignment" })
      .click();

    await expect(page).toHaveURL(
      /\/bracket\?progression=cleared&match=SF1$/,
    );
    await expect(page.locator(".form-feedback--success")).toContainText(
      "source result is editable again",
    );
    expect(
      queryLocalSql(`
        select team1_id is null
        from public.matches
        where code = 'SF1';
      `),
    ).toBe("t");
    expect(
      queryLocalSql(`
        select count(*)
        from public.audit_log
        where entity_type = 'matches'
          and entity_key = 'SF1'
          and before_data ->> 'team1_id' is not null
          and after_data ->> 'team1_id' is null;
      `),
    ).toBe("1");
    expect(
      queryLocalSql(`
        select count(*)
        from public.audit_log
        where entity_type = 'matches'
          and entity_key = 'SF1'
          and (
            before_data ->> 'team1_id' is distinct from
              after_data ->> 'team1_id'
          );
      `),
    ).toBe("2");

    await page.goto("/matches/QF1/result");
    await expect(
      page.getByRole("heading", { name: "Correct the match result" }),
    ).toBeVisible();
  } finally {
    resetLocalSupabaseDatabase();
  }
});

test("rejects a stale downstream assignment without advancing a team", async (
  { page },
  testInfo,
) => {
  executeLocalSql(COMPLETED_QUARTERFINALS_SQL);

  try {
    await unlockOrganizerMode(page);
    if (testInfo.project.name === "android-chrome") {
      await page.setViewportSize({ width: 320, height: 740 });
    }
    await page.goto("/bracket/SF1/assignment");

    executeLocalSql(`
      update public.matches
      set label = label || ' '
      where code = 'SF1';
    `);

    const qf1Path = page.getByRole("region", {
      name: "Winner QF1 → SF1",
    });
    await qf1Path
      .getByRole("button", { name: "Review assignment" })
      .click();
    await qf1Path
      .getByRole("group", { name: "Confirm SF1 assignment" })
      .getByRole("button", { name: "Assign winner" })
      .click();

    await expect(
      qf1Path.locator(".form-feedback--conflict"),
    ).toContainText("changed on another device");
    await expect(
      qf1Path.getByRole("button", { name: "Reload bracket" }),
    ).toBeVisible();
    expect(
      queryLocalSql(`
        select team1_id is null
        from public.matches
        where code = 'SF1';
      `),
    ).toBe("t");
    expect(
      queryLocalSql(`
        select count(*)
        from public.audit_log
        where entity_type = 'matches'
          and entity_key = 'SF1'
          and after_data ->> 'team1_id' is not null;
      `),
    ).toBe("0");
  } finally {
    resetLocalSupabaseDatabase();
  }
});
