import { expect, test } from "@playwright/test";

import {
  formErrors,
  formFeedback,
  unlockOrganizerMode,
} from "./support/organizer";
import {
  executeLocalSql,
  queryLocalSql,
  resetLocalSupabaseDatabase,
} from "./support/local-supabase";

const resilienceFixtures: Record<string, string> = {
  "android-chrome": "GB-10",
  "ios-safari": "GB-11",
  "desktop-chrome": "GB-12",
};

test("keeps entered schedule values through a network failure and retry", async ({
  page,
}, testInfo) => {
  const code = resilienceFixtures[testInfo.project.name];
  await unlockOrganizerMode(page);
  await page.goto(`/matches/${code}/schedule`);

  await page.route(
    (url) => url.pathname === `/matches/${code}/schedule`,
    async (route) => {
      if (route.request().method() === "POST") {
        await route.abort("failed");
        return;
      }

      await route.continue();
    },
  );

  await page.getByLabel("Date (required)").fill("2026-08-22");
  await page.getByLabel("Time (required)").fill("07:30");
  await page.getByLabel("Court or venue (required)").fill("Court 12");
  await page.getByRole("button", { name: "Save schedule" }).click();

  await expect(formErrors(page).first()).toContainText(
    "This update could not be sent from this device.",
  );
  await expect(page.getByLabel("Date (required)")).toHaveValue("2026-08-22");
  await expect(page.getByLabel("Time (required)")).toHaveValue("07:30");
  await expect(page.getByLabel("Court or venue (required)")).toHaveValue(
    "Court 12",
  );

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.getByRole("button", { name: "Save schedule" }).click();
  await expect(formFeedback(page)).toContainText(
    /Match scheduled\.|Schedule updated\./,
  );
});

test("keeps a knockout winner selected through a network failure", async ({
  page,
}) => {
  executeLocalSql(`
    begin;

    update public.matches
    set
      team1_id = (
        select id from public.teams order by id limit 1 offset 4
      ),
      team2_id = (
        select id from public.teams order by id limit 1 offset 5
      )
    where code = 'QF3';

    update public.matches
    set
      status = 'completed',
      deciding_set_format = 'full_set',
      outcome_type = 'normal',
      sets = '[[6, 4], [6, 4]]'::jsonb,
      winner_id = team1_id,
      played_at = statement_timestamp() - interval '1 day',
      completed_at = statement_timestamp()
    where code = 'QF3';

    commit;
  `);

  try {
    await unlockOrganizerMode(page);
    await page.goto("/bracket/SF2/assignment");

    await page.route(
      (url) => url.pathname === "/bracket/SF2/assignment",
      async (route) => {
        if (route.request().method() === "POST") {
          await route.abort("failed");
          return;
        }

        await route.continue();
      },
    );

    const qf3Path = page.getByRole("region", {
      name: "Winner QF3 → SF2",
    });
    await qf3Path
      .getByRole("button", { name: "Review assignment" })
      .click();
    await qf3Path
      .getByRole("group", { name: "Confirm SF2 assignment" })
      .getByRole("button", { name: "Assign winner" })
      .click();

    await expect(qf3Path.locator(".form-feedback--error")).toContainText(
      "This update could not be sent from this device.",
    );
    await expect(qf3Path.getByRole("radio")).toBeChecked();
    expect(
      queryLocalSql(`
        select team1_id is null
        from public.matches
        where code = 'SF2';
      `),
    ).toBe("t");
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    resetLocalSupabaseDatabase();
  }
});
