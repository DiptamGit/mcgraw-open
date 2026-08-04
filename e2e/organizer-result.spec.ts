import { expect, test, type Page } from "@playwright/test";

import {
  formErrors,
  formFeedback,
  recentTournamentDate,
  settleAfterMutation,
  unlockOrganizerMode,
} from "./support/organizer";

/** Each project edits its own fixtures so runs never collide. */
const resultFixtures: Record<
  string,
  { normal: string; walkover: string; concurrent: string }
> = {
  "android-chrome": { normal: "GA-01", walkover: "GA-02", concurrent: "GA-07" },
  "ios-safari": { normal: "GA-03", walkover: "GA-04", concurrent: "GA-08" },
  "desktop-chrome": { normal: "GA-05", walkover: "GA-06", concurrent: "GA-09" },
};

async function readCompletedGroupACount(page: Page): Promise<number> {
  await page.goto("/groups");
  const progress = await page
    .getByRole("region", { name: "Group A standings table" })
    .locator("xpath=ancestor::section[1]")
    .locator(".standings-group__progress")
    .innerText();
  const completed = Number.parseInt(progress.trim().split(" ")[0], 10);
  expect(Number.isNaN(completed)).toBe(false);
  return completed;
}

test.describe("organizer scoring", () => {
  test("records a normal result and updates the standings", async ({
    page,
  }, testInfo) => {
    const code = resultFixtures[testInfo.project.name].normal;
    await unlockOrganizerMode(page);
    const completedBefore = await readCompletedGroupACount(page);

    await page.goto(`/matches/${code}/result`);
    await page.locator('input[name="outcomeType"][value="normal"]').check();
    await page.locator('input[name="winnerId"]').first().check();
    await page
      .locator('input[name="decidingSetFormat"][value="full_set"]')
      .check();
    await page.locator("#set1Team1").fill("6");
    await page.locator("#set1Team2").fill("4");
    await page.locator("#set2Team1").fill("6");
    await page.locator("#set2Team2").fill("3");
    await page.getByLabel("Played date (required)").fill(recentTournamentDate(2));
    await page.getByLabel("Played time (required)").fill("10:00");
    await page.getByRole("button", { name: "Record result" }).click();

    await expect(formFeedback(page)).toContainText("Result recorded");
    await settleAfterMutation(page);

    await page.goto("/matches");
    const card = page.getByRole("article", { name: new RegExp(`^${code}:`) });
    await expect(card).toContainText("Completed");
    await expect(card).toContainText("Winner");

    expect(await readCompletedGroupACount(page)).toBe(completedBefore + 1);
  });

  test("rejects an impossible score without losing entered values", async ({
    page,
  }, testInfo) => {
    const code = resultFixtures[testInfo.project.name].walkover;
    await unlockOrganizerMode(page);

    await page.goto(`/matches/${code}/result`);
    await page.locator('input[name="outcomeType"][value="normal"]').check();
    await page.locator('input[name="winnerId"]').first().check();
    await page
      .locator('input[name="decidingSetFormat"][value="full_set"]')
      .check();
    await page.locator("#set1Team1").fill("6");
    await page.locator("#set1Team2").fill("4");
    await page.locator("#set2Team1").fill("2");
    await page.locator("#set2Team2").fill("6");
    await page.getByLabel("Played date (required)").fill(recentTournamentDate(3));
    await page.getByLabel("Played time (required)").fill("11:00");
    await page.getByRole("button", { name: "Record result" }).click();

    await expect(formErrors(page).first()).toBeVisible();
    await expect(page.locator("#set1Team1")).toHaveValue("6");
    await expect(page.locator("#set2Team2")).toHaveValue("6");
  });

  test("records a walkover and clears it only after confirmation", async ({
    page,
  }, testInfo) => {
    const code = resultFixtures[testInfo.project.name].walkover;
    await unlockOrganizerMode(page);

    await page.goto(`/matches/${code}/result`);
    await page.locator('input[name="outcomeType"][value="walkover"]').check();
    await expect(
      page.getByText("No score for a walkover."),
    ).toBeVisible();
    await page.locator('input[name="winnerId"]').last().check();
    await page.getByLabel("Played date (required)").fill(recentTournamentDate(4));
    await page.getByLabel("Played time (required)").fill("12:00");
    await page.getByRole("button", { name: "Record result" }).click();

    await expect(formFeedback(page)).toContainText("Result recorded");
    await settleAfterMutation(page);

    await page.goto("/matches");
    const card = page.getByRole("article", { name: new RegExp(`^${code}:`) });
    await expect(card).toContainText("Walkover");

    await page.goto(`/matches/${code}/result`);
    await settleAfterMutation(page);
    await page.getByRole("button", { name: "Clear result" }).click();
    await expect(
      page.getByRole("group", { name: "Confirm clear result" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Keep result" }).click();
    await expect(
      page.getByRole("group", { name: "Confirm clear result" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Clear result" }).click();
    await page
      .getByRole("group", { name: "Confirm clear result" })
      .getByRole("button", { name: "Clear result" })
      .click();

    await expect(formFeedback(page)).toContainText("Result cleared");

    await page.goto("/matches");
    await expect(
      page.getByRole("article", { name: new RegExp(`^${code}:`) }),
    ).toContainText("Unscheduled");
  });

  test("blocks a second submission while the result is saving", async ({
    page,
  }, testInfo) => {
    // Holding an intercepted response is unreliable in WebKit, and the pending
    // behaviour under test comes from React rather than the browser.
    test.skip(
      testInfo.project.name === "ios-safari",
      "Held request interception is unreliable in WebKit.",
    );

    const code = resultFixtures[testInfo.project.name].concurrent;
    await unlockOrganizerMode(page);
    await page.goto(`/matches/${code}/result`);

    await page.locator('input[name="outcomeType"][value="normal"]').check();
    await page.locator('input[name="winnerId"]').first().check();
    await page
      .locator('input[name="decidingSetFormat"][value="full_set"]')
      .check();
    await page.locator("#set1Team1").fill("6");
    await page.locator("#set1Team2").fill("2");
    await page.locator("#set2Team1").fill("7");
    await page.locator("#set2Team2").fill("5");
    await page.getByLabel("Played date (required)").fill(recentTournamentDate(2));
    await page.getByLabel("Played time (required)").fill("14:00");

    let releaseSave: () => void = () => {};
    const heldSave = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    let saveRequests = 0;

    await page.route(
      (url) => url.pathname === `/matches/${code}/result`,
      async (route) => {
        if (route.request().method() === "POST") {
          saveRequests += 1;
          await heldSave;
        }

        await route.continue();
      },
    );

    const saveButton = page.locator(
      '.result-form__actions button[type="submit"]',
    );
    await saveButton.click();

    await expect(saveButton).toBeDisabled();
    await expect(saveButton).toContainText("Recording result…");

    await saveButton.click({ force: true });
    expect(saveRequests).toBe(1);

    releaseSave();
    await expect(formFeedback(page)).toContainText(/Result (recorded|updated)\./);
    expect(saveRequests).toBe(1);
  });
});
