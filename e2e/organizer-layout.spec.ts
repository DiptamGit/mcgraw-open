import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalPageOverflow,
  unlockOrganizerMode,
} from "./support/organizer";

/** A fixture no other spec edits, so these pages always render their forms. */
const LAYOUT_MATCH = "GB-15";

const organizerRoutes = [
  "/organizer/unlock",
  `/matches/${LAYOUT_MATCH}/schedule`,
  `/matches/${LAYOUT_MATCH}/result`,
  "/groups/finalize",
];

test.describe("organizer layout", () => {
  test("organizer pages fit a 320px phone without page overflow", async ({
    page,
  }) => {
    await unlockOrganizerMode(page);
    await page.setViewportSize({ width: 320, height: 640 });

    for (const route of organizerRoutes) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalPageOverflow(page);
    }
  });

  test("organizer form controls meet the touch target floor", async ({
    page,
  }) => {
    await unlockOrganizerMode(page);
    await page.goto(`/matches/${LAYOUT_MATCH}/schedule`);

    await expect(page.locator("form.schedule-form")).toBeVisible();

    const controls = page.locator(
      '.schedule-form input:not([type="hidden"]):visible, .schedule-form button:visible',
    );
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const box = await controls.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});
