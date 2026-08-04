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

const FINALIZED_GROUPS_SQL = `
begin;

update public.teams as team
set final_rank = ranking.final_rank
from (
  select
    id,
    row_number() over (
      partition by group_label
      order by id
    )::integer as final_rank
  from public.teams
) as ranking
where team.id = ranking.id;

update public.tournament_state
set
  group_stage_status = 'finalized',
  groups_finalized_at = statement_timestamp(),
  tie_resolution_note = null
where id = 1;

commit;
`;

test("previews and assigns the finalized quarterfinal draw", async (
  { page },
  testInfo,
) => {
  executeLocalSql(FINALIZED_GROUPS_SQL);

  try {
    await unlockOrganizerMode(page);
    if (testInfo.project.name === "android-chrome") {
      await page.setViewportSize({ width: 320, height: 740 });
    }
    await page.goto("/bracket");
    await page
      .getByRole("link", { name: "Review quarterfinal assignments" })
      .click();

    await expect(
      page.getByRole("heading", { name: "The locked draw is ready." }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", {
        name: "Quarterfinal assignment preview",
      }),
    ).toContainText("QF1");
    await expect(
      page.getByRole("region", {
        name: "Quarterfinal assignment preview",
      }),
    ).toContainText("A1");
    await expect(
      page.getByRole("region", {
        name: "Quarterfinal assignment preview",
      }),
    ).toContainText("B4");
    await expectNoHorizontalPageOverflow(page);

    await page
      .getByRole("button", { name: "Assign quarterfinals" })
      .click();
    await expect(
      page.getByRole("button", { name: "Keep bracket unchanged" }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Keep bracket unchanged" })
      .click();
    await expect(
      page.getByRole("button", { name: "Assign quarterfinals" }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Assign quarterfinals" })
      .click();
    await page
      .getByRole("group", { name: "Confirm quarterfinal assignments" })
      .getByRole("button", { name: "Assign quarterfinals" })
      .click();

    await expect(page).toHaveURL(/\/bracket\?assignment=assigned$/);
    await expect(page.locator(".form-feedback--success")).toContainText(
      "Quarterfinal teams assigned",
    );
    await expect(
      page.getByText("Net Results - Ranjit / Venu C", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Drop Shot Society - Giri / Srini", {
        exact: true,
      }),
    ).toBeVisible();

    expect(
      queryLocalSql(`
        select count(*)
        from public.matches
        where stage = 'quarterfinal'
          and team1_id is not null
          and team2_id is not null;
      `),
    ).toBe("4");
    expect(
      queryLocalSql(`
        select count(*)
        from public.audit_log
        where entity_type = 'bracket'
          and entity_key = 'quarterfinal_assignment';
      `),
    ).toBe("1");
    expect(
      queryLocalSql(`
        select count(*)
        from public.audit_log
        where entity_type = 'matches'
          and entity_key in ('QF1', 'QF2', 'QF3', 'QF4')
          and before_data ->> 'team1_id' is null
          and before_data ->> 'team2_id' is null
          and after_data ->> 'team1_id' is not null
          and after_data ->> 'team2_id' is not null;
      `),
    ).toBe("4");

    await page.goto("/matches?stage=quarterfinal");
    await expect(page.locator(".matches-view__count")).toHaveText(
      "4 matches",
    );
    await expect(
      page.getByText("Net Results - Ranjit / Venu C", { exact: true }),
    ).toBeVisible();
  } finally {
    resetLocalSupabaseDatabase();
  }
});

test("rejects a stale quarterfinal preview without a partial assignment", async (
  { page },
  testInfo,
) => {
  executeLocalSql(FINALIZED_GROUPS_SQL);

  try {
    await unlockOrganizerMode(page);
    if (testInfo.project.name === "android-chrome") {
      await page.setViewportSize({ width: 320, height: 740 });
    }
    await page.goto("/bracket/quarterfinals");

    executeLocalSql(`
      update public.matches
      set label = label || ' '
      where code = 'QF1';
    `);

    await page
      .getByRole("button", { name: "Assign quarterfinals" })
      .click();
    await page
      .getByRole("group", { name: "Confirm quarterfinal assignments" })
      .getByRole("button", { name: "Assign quarterfinals" })
      .click();

    await expect(page.locator(".form-feedback--conflict")).toContainText(
      "changed on another device",
    );
    await expect(
      page.getByRole("button", { name: "Reload draw" }),
    ).toBeVisible();
    expect(
      queryLocalSql(`
        select count(*)
        from public.matches
        where stage = 'quarterfinal'
          and (team1_id is not null or team2_id is not null);
      `),
    ).toBe("0");
    expect(
      queryLocalSql(`
        select count(*)
        from public.audit_log
        where entity_type = 'bracket'
          and entity_key = 'quarterfinal_assignment';
      `),
    ).toBe("0");
  } finally {
    resetLocalSupabaseDatabase();
  }
});
