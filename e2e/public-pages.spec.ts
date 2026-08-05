import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalPageOverflow,
  settleAfterMutation,
} from "./support/organizer";
import {
  executeLocalSql,
  getLocalSupabaseEnvironment,
  resetLocalSupabaseDatabase,
} from "./support/local-supabase";

const publicRoutes = ["/", "/groups", "/matches", "/bracket"];

test.describe("public tournament pages", () => {
  test("home shows the tournament, upcoming matches, and group leaders", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "McGraw Open" }),
    ).toBeVisible();
    await expect(page.getByText("Twelve doubles teams")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Upcoming matches" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Current leaders" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Group A" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Group B" })).toBeVisible();
  });

  test("groups shows both standings tables and the tiebreak guide", async ({
    page,
  }) => {
    await page.goto("/groups");

    const groupAStandings = page.getByRole("region", {
      name: "Group A standings table",
    });
    await expect(groupAStandings).toBeVisible();
    await expect(
      groupAStandings.getByRole("row"),
    ).toHaveCount(7);
    await expect(
      groupAStandings.getByText("Fault Tolerant - Shankar / Mohan", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Group B standings table" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Wins lead. Head-to-head breaks ties." }),
    ).toBeVisible();
  });

  test("matches filters keep their state in the URL and can be reset", async ({
    page,
  }) => {
    await page.goto("/matches");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Matches");
    await expect(page.locator(".matches-view__count")).toHaveText(
      "37 matches",
    );

    await page.getByRole("link", { name: "Group A" }).click();
    await expect(page).toHaveURL(/\?group=A$/);
    await expect(page.locator(".matches-view__count")).toHaveText("15 matches");
    await expect(
      page.getByRole("article", { name: /^GA-15:/ }),
    ).toContainText("Fault Tolerant - Shankar / Mohan");
    await settleAfterMutation(page);

    await page.getByRole("link", { name: "Quarterfinals" }).click();
    await expect(page).toHaveURL(/group=A&stage=quarterfinal$/);
    await expect(
      page.getByRole("heading", { name: "No matches match these filters." }),
    ).toBeVisible();
    await settleAfterMutation(page);

    // Next.js commits a dynamic navigation only once its payload arrives, so a
    // click can be dropped while an earlier navigation is still streaming.
    await expect(async () => {
      await page.getByRole("link", { name: "Show all matches" }).click();
      await expect(page).toHaveURL(/\/matches$/, { timeout: 4_000 });
    }).toPass({ timeout: 20_000 });
    await expect(page.locator(".matches-view__count")).toHaveText(
      "37 matches",
    );
  });

  test("bracket renders the seeded 4-2-1 path", async ({ page }) => {
    await page.goto("/bracket");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bracket");
    await expect(
      page.getByRole("heading", { name: "Quarterfinals" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Semifinals" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Final", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".bracket-board article")).toHaveCount(7);
    await expect(page.getByText("A1", { exact: true })).toBeVisible();
    await expect(page.getByText("B4", { exact: true })).toBeVisible();
    await expect(page.getByText("Winner QF1", { exact: true })).toBeVisible();
    await expect(page.getByText("Winner SF2", { exact: true })).toBeVisible();
    await expect(page.getByText("Soon", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /Manage (SF1|SF2|Final) teams/ }),
    ).toHaveCount(0);
  });

  test("public clients cannot read audits or call knockout assignment functions", async ({
    request,
  }) => {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } =
      getLocalSupabaseEnvironment();
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    };
    const auditResponse = await request.get(
      `${SUPABASE_URL}/rest/v1/audit_log?select=id`,
      { headers },
    );
    const assignmentResponse = await request.post(
      `${SUPABASE_URL}/rest/v1/rpc/update_knockout_assignment`,
      {
        headers,
        data: {
          p_intent: "assign",
          p_downstream_code: "SF1",
          p_team_slot: "team1_id",
          p_expected_downstream_updated_at: "2026-08-04T18:00:00Z",
          p_expected_source_updated_at: "2026-08-04T18:00:00Z",
          p_team_id: "a0000001-0000-4000-8000-000000000001",
        },
      },
    );

    expect(auditResponse.ok()).toBe(false);
    expect(assignmentResponse.ok()).toBe(false);
  });

  test("bracket uses connected round columns on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/bracket");

    const columnCount = await page
      .getByRole("group", { name: "McGraw Open knockout bracket" })
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      );

    expect(columnCount).toBe(3);
  });

  test("bracket presents assigned, scheduled, and completed matches", async ({
    page,
  }) => {
    executeLocalSql(`
      update public.matches
      set team1_id = 'a0000001-0000-4000-8000-000000000001'
      where code = 'QF1';

      update public.matches
      set
        team1_id = 'a0000002-0000-4000-8000-000000000002',
        team2_id = 'b0000003-0000-4000-8000-000000000003',
        status = 'scheduled',
        scheduled_at = '2026-09-12T20:30:00+00:00',
        venue = 'McGraw Park · Court 2'
      where code = 'QF2';

      update public.matches
      set
        team1_id = 'a0000001-0000-4000-8000-000000000001',
        team2_id = 'b0000004-0000-4000-8000-000000000004',
        status = 'completed',
        deciding_set_format = 'match_tiebreak',
        outcome_type = 'normal',
        sets = '[[6, 4], [3, 6], [10, 8]]'::jsonb,
        winner_id = 'a0000001-0000-4000-8000-000000000001',
        played_at = '2026-09-20T20:30:00+00:00',
        completed_at = '2026-09-20T22:00:00+00:00'
      where code = 'SF1';
    `);

    try {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto("/bracket");
      await expectNoHorizontalPageOverflow(page);

      const quarterfinalOne = page.getByRole("article", {
        name: /^QF1:/,
      });
      await expect(quarterfinalOne).toContainText(
        "Net Results - Ranjit / Venu C",
      );
      await expect(quarterfinalOne.getByText("A1", { exact: true })).toBeVisible();
      await expect(quarterfinalOne.getByText("B4", { exact: true })).toBeVisible();

      const quarterfinalTwo = page.getByRole("article", {
        name: /^QF2:/,
      });
      await expect(quarterfinalTwo).toContainText("Scheduled");
      await expect(quarterfinalTwo).toContainText(
        "Sep 12, 2026 · 3:30 PM CDT",
      );
      await expect(quarterfinalTwo).toContainText("McGraw Park · Court 2");

      const semifinalOne = page.getByRole("article", {
        name: /^SF1:/,
      });
      await expect(semifinalOne).toContainText("Completed");
      await expect(semifinalOne.getByText("MTB", { exact: true })).toBeVisible();
      await expect(
        semifinalOne.getByText("Winner QF1", { exact: true }),
      ).toBeVisible();
      await expect(semifinalOne).toContainText("Winner");
    } finally {
      resetLocalSupabaseDatabase();
    }
  });

  for (const route of publicRoutes) {
    test(`${route} has no horizontal page overflow at 320px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(route);

      await expectNoHorizontalPageOverflow(page);
    });
  }

  test("expanded Group A remains usable at desktop and 200% zoom", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "ios-safari",
      "The automated zoom simulation uses Chromium CSS zoom.",
    );

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/groups");
    await expectNoHorizontalPageOverflow(page);

    const standingsRegion = page.getByRole("region", {
      name: "Group A standings table",
    });
    await standingsRegion.focus();
    await expect(standingsRegion).toBeFocused();

    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    await expectNoHorizontalPageOverflow(page);
    await expect(standingsRegion.getByRole("row")).toHaveCount(7);

    await page.goto("/matches?group=A");
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    await expectNoHorizontalPageOverflow(page);
    await expect(page.locator(".matches-view__count")).toHaveText("15 matches");
    await page.getByRole("link", { name: "All groups" }).focus();
    await expect(page.getByRole("link", { name: "All groups" })).toBeFocused();
  });

  test("the skip link is the first keyboard stop and reaches main content", async ({
    page,
  }, testInfo) => {
    // WebKit only moves keyboard focus to links when macOS full keyboard
    // access is enabled, so the keyboard pass runs on the Chromium projects.
    test.skip(
      testInfo.project.name === "ios-safari",
      "WebKit does not tab to links by default.",
    );

    await page.goto("/");
    await page.keyboard.press("Tab");

    const focused = page.locator(":focus");
    await expect(focused).toHaveText("Skip to main content");

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);
  });

  test("public pages send baseline security headers", async ({ page }) => {
    const response = await page.goto("/matches");
    const headers = response?.headers() ?? {};

    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toMatch(/script-src[^;]*nonce-/);
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("the content security policy does not block the application", async ({
    page,
  }) => {
    const blocked: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        message.text().toLowerCase().includes("content security policy")
      ) {
        blocked.push(message.text());
      }
    });

    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary" }).first().waitFor();
    await page.getByRole("link", { name: "View all matches" }).click();
    await expect(page).toHaveURL(/\/matches$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Matches");

    expect(blocked).toEqual([]);
  });
});
