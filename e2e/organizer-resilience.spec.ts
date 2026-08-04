import { expect, test } from "@playwright/test";

import {
  formErrors,
  formFeedback,
  unlockOrganizerMode,
  waitForOrganizerForm,
} from "./support/organizer";

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
  await waitForOrganizerForm(page);

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
