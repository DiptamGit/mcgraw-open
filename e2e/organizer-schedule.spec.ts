import { expect, test, type Page } from "@playwright/test";

import {
  PROXY_HEADERS,
  formErrors,
  formFeedback,
  settleAfterMutation,
  unlockOrganizerMode,
  waitForOrganizerForm,
} from "./support/organizer";

/** Every project and test edits its own fixture so runs never collide. */
const scheduleFixtures: Record<
  string,
  { lifecycle: string; validation: string; concurrent: string }
> = {
  "android-chrome": {
    lifecycle: "GB-01",
    validation: "GB-04",
    concurrent: "GB-07",
  },
  "ios-safari": {
    lifecycle: "GB-02",
    validation: "GB-05",
    concurrent: "GB-08",
  },
  "desktop-chrome": {
    lifecycle: "GB-03",
    validation: "GB-06",
    concurrent: "GB-09",
  },
};

async function openScheduleForm(page: Page, code: string): Promise<void> {
  await page.goto(`/matches/${code}/schedule`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Schedule match|Reschedule match/,
  );
  await waitForOrganizerForm(page);
}

test.describe("organizer scheduling", () => {
  test("schedules, reschedules, and removes a match schedule", async ({
    page,
  }, testInfo) => {
    const code = scheduleFixtures[testInfo.project.name].lifecycle;
    await unlockOrganizerMode(page);
    await openScheduleForm(page, code);

    await page.getByLabel("Date (required)").fill("2026-08-15");
    await page.getByLabel("Time (required)").fill("18:30");
    await page.getByLabel("Court or venue (required)").fill("Court 3");
    await page.getByRole("button", { name: "Save schedule" }).click();

    await expect(formFeedback(page)).toContainText(
      /Match scheduled\.|Schedule updated\./,
    );
    await settleAfterMutation(page);

    await page.goto("/matches");
    const scheduledCard = page.getByRole("article", {
      name: new RegExp(`^${code}:`),
    });
    await expect(scheduledCard).toContainText("Scheduled");
    await expect(scheduledCard).toContainText("Court 3");
    await expect(scheduledCard).toContainText("Aug 15, 2026");

    await openScheduleForm(page, code);
    await page.getByLabel("Court or venue (required)").fill("Court 5");
    await page.getByRole("button", { name: "Save schedule" }).click();
    await expect(formFeedback(page)).toContainText("Schedule updated.");
    await settleAfterMutation(page);

    await page.getByRole("button", { name: "Remove schedule" }).click();
    await expect(
      page.getByRole("group", { name: "Confirm removing the schedule" }),
    ).toBeVisible();
    await page
      .getByRole("group", { name: "Confirm removing the schedule" })
      .getByRole("button", { name: "Remove schedule" })
      .click();

    await expect(formFeedback(page)).toContainText(
      "Schedule removed. This match is now unscheduled.",
    );

    await page.goto("/matches");
    await expect(
      page.getByRole("article", { name: new RegExp(`^${code}:`) }),
    ).toContainText("Unscheduled");
  });

  test("keeps entered values and reports a field error on invalid input", async ({
    page,
  }, testInfo) => {
    const code = scheduleFixtures[testInfo.project.name].validation;
    await unlockOrganizerMode(page);
    await openScheduleForm(page, code);

    await page.getByLabel("Date (required)").fill("2026-08-20");
    await page.getByLabel("Time (required)").fill("09:00");
    await page.getByLabel("Court or venue (required)").fill("   ");
    await page
      .getByRole("button", { name: "Save schedule" })
      .click();

    await expect(formErrors(page).first()).toContainText(
      "Check the highlighted schedule details.",
    );
    await expect(page.getByLabel("Date (required)")).toHaveValue("2026-08-20");
    await expect(page.getByLabel("Time (required)")).toHaveValue("09:00");
  });

  test("rejects a stale write made from another device", async ({
    browser,
  }, testInfo) => {
    const code = scheduleFixtures[testInfo.project.name].concurrent;
    // Two isolated contexts model two organizer devices. A second tab in one
    // browser window is unreliable because hidden pages are throttled.
    const firstContext = await browser.newContext({
      extraHTTPHeaders: PROXY_HEADERS,
    });
    const first = await firstContext.newPage();
    await unlockOrganizerMode(first);

    const secondContext = await browser.newContext({
      extraHTTPHeaders: PROXY_HEADERS,
      storageState: await firstContext.storageState(),
    });
    const second = await secondContext.newPage();

    await openScheduleForm(first, code);
    await openScheduleForm(second, code);

    await first.getByLabel("Date (required)").fill("2026-09-01");
    await first.getByLabel("Time (required)").fill("17:00");
    await first.getByLabel("Court or venue (required)").fill("Court 1");
    await first.getByRole("button", { name: "Save schedule" }).click();
    await expect(formFeedback(first)).toContainText(
      /Match scheduled\.|Schedule updated\./,
    );

    await second.getByLabel("Date (required)").fill("2026-09-02");
    await second.getByLabel("Time (required)").fill("08:00");
    await second.getByLabel("Court or venue (required)").fill("Court 9");
    await second.getByRole("button", { name: "Save schedule" }).click();

    await expect(formErrors(second).first()).toContainText(
      "This match changed on another device. Reload before saving again.",
    );
    await expect(
      second.getByRole("button", { name: "Reload match" }),
    ).toBeVisible();

    await first.goto("/matches");
    await expect(
      first.getByRole("article", { name: new RegExp(`^${code}:`) }),
    ).toContainText("Court 1");

    await firstContext.close();
    await secondContext.close();
  });

});
