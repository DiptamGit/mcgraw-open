import { expect, test } from "@playwright/test";

import { E2E_ORGANIZER_PIN } from "./support/constants";
import { formErrors, unlockOrganizerMode } from "./support/organizer";

test.describe("organizer unlock", () => {
  test("organizer routes are locked until the shared PIN is accepted", async ({
    page,
  }) => {
    await page.goto("/matches/GA-01/schedule");

    await expect(page).toHaveURL(/\/organizer\/unlock\?returnTo=/);
    await expect(
      page.getByRole("heading", { name: "Unlock this device" }),
    ).toBeVisible();
  });

  test("a wrong PIN is refused without revealing the configured value", async ({
    page,
  }) => {
    await page.goto("/organizer/unlock?returnTo=%2Fmatches");
    await page.getByLabel("Shared organizer PIN").fill("not-the-pin");
    await page.getByRole("button", { name: "Unlock organizer mode" }).click();

    await expect(formErrors(page).first()).toContainText(
      "Unlock was not accepted.",
    );

    const markup = await page.content();
    expect(markup).not.toContain(E2E_ORGANIZER_PIN);
    expect(await page.evaluate(() => document.cookie)).toBe("");
    expect(
      await page.evaluate(() => window.localStorage.length),
    ).toBe(0);
  });

  test("unlocking enables organizer controls and locking removes them", async ({
    page,
  }) => {
    await unlockOrganizerMode(page);

    await page.goto("/matches");
    await expect(
      page.getByRole("link", { name: "Schedule match" }).first(),
    ).toBeVisible();

    const cookies = await page.context().cookies();
    const organizerCookie = cookies.find(
      (cookie) => cookie.name === "mgo_organizer",
    );
    expect(organizerCookie?.httpOnly).toBe(true);
    expect(organizerCookie?.sameSite).toBe("Lax");
    expect(organizerCookie?.value).not.toContain(E2E_ORGANIZER_PIN);

    await page.getByRole("button", { name: "Lock again" }).click();
    await expect(
      page.getByRole("complementary", { name: "Organizer access" }),
    ).toContainText("Organizer updates locked");
    await expect(
      page.getByRole("link", { name: "Schedule match" }),
    ).toHaveCount(0);
  });
});
