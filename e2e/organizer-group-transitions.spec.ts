import { expect, test } from "@playwright/test";

import {
  executeLocalSql,
  queryLocalSql,
  resetLocalSupabaseDatabase,
} from "./support/local-supabase";
import { unlockOrganizerMode } from "./support/organizer";

const COMPLETE_GROUP_STAGE_SQL = `
begin;

update public.tournament_state
set
  group_stage_status = 'open',
  groups_finalized_at = null,
  tie_resolution_note = null
where id = 1;

update public.teams
set final_rank = null;

update public.matches
set
  status = 'completed',
  scheduled_at = null,
  venue = null,
  deciding_set_format = 'full_set',
  outcome_type = 'normal',
  sets = '[[6, 0], [6, 0]]'::jsonb,
  winner_id = team1_id,
  played_at = '2026-08-01T15:00:00Z',
  completed_at = '2026-08-01T16:00:00Z'
where stage = 'group';

commit;
`;

test("finalizes and reopens the completed group stage", async ({ page }) => {
  executeLocalSql(COMPLETE_GROUP_STAGE_SQL);

  try {
    await unlockOrganizerMode(page);
    await page.goto("/groups/finalize");

    await expect(
      page.getByRole("heading", {
        name: "Every group result is recorded.",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Finalize groups" }).click();
    await page
      .getByRole("group", { name: "Confirm group finalization" })
      .getByRole("button", { name: "Finalize groups" })
      .click();

    await expect(page).toHaveURL(/\/groups\?transition=finalized$/);
    await expect(page.locator(".form-feedback--success")).toContainText(
      "Groups finalized.",
    );
    await expect(page.getByText("Locked", { exact: true }).first()).toBeVisible();

    await page.goto("/groups/reopen");
    await expect(
      page.getByRole("heading", { level: 1, name: "Reopen groups" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reopen groups" }).click();
    await page
      .getByRole("group", { name: "Confirm reopening groups" })
      .getByRole("button", { name: "Reopen groups" })
      .click();

    await expect(page).toHaveURL(/\/groups\?transition=reopened$/);
    await expect(page.locator(".form-feedback--success")).toContainText(
      "Groups reopened.",
    );

    await page.goto("/matches");
    await expect(
      page.getByRole("link", { name: "Edit result" }).first(),
    ).toBeVisible();

    expect(
      queryLocalSql(`
        select count(*)
        from public.audit_log
        where entity_type = 'group_stage'
          and entity_key in ('finalization', 'reopening');
      `),
    ).toBe("2");
  } finally {
    resetLocalSupabaseDatabase();
  }
});
