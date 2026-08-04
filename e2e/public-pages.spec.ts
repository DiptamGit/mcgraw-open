import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalPageOverflow,
  settleAfterMutation,
} from "./support/organizer";

const publicRoutes = ["/", "/groups", "/matches", "/bracket"];

test.describe("public tournament pages", () => {
  test("home shows the tournament, upcoming matches, and group leaders", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "McGraw Open" }),
    ).toBeVisible();
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

    await expect(
      page.getByRole("region", { name: "Group A standings table" }),
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
      "32 matches",
    );

    await page.getByRole("link", { name: "Group A" }).click();
    await expect(page).toHaveURL(/\?group=A$/);
    await expect(page.locator(".matches-view__count")).toHaveText("10 matches");
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
      "32 matches",
    );
  });

  test("bracket stays honest before the knockout release", async ({ page }) => {
    await page.goto("/bracket");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
