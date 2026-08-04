import { expect, type Page } from "@playwright/test";

import { E2E_ORGANIZER_PIN } from "./constants";

/**
 * Vercel supplies this header in every deployed environment and the unlock
 * rate limiter requires it. Manually created contexts must set it too.
 */
export const PROXY_HEADERS = { "x-forwarded-for": "203.0.113.10" } as const;

export async function unlockOrganizerMode(page: Page): Promise<void> {
  await page.goto("/organizer/unlock?returnTo=%2Fmatches");
  await page.getByLabel("Shared organizer PIN").fill(E2E_ORGANIZER_PIN);
  await page.getByRole("button", { name: "Unlock organizer mode" }).click();
  await expect(
    page.getByRole("complementary", { name: "Organizer access" }),
  ).toContainText("Organizer mode");
}

/**
 * A recent Central Time date the server accepts as a played date. Played times
 * may not be in the future, so fixed calendar dates would expire.
 */
export function recentTournamentDate(daysAgo = 1): string {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return parts;
}

/**
 * Waits for in-flight navigation, refresh, and prefetch traffic to finish so
 * the next interaction is not sent mid-render. Next.js commits a dynamic
 * navigation only after its payload arrives, so a click dispatched during one
 * can be dropped.
 */
export async function settleAfterMutation(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
}

/** Waits until React has attached the wrapped server action to a form. */
export async function waitForOrganizerForm(page: Page): Promise<void> {
  await expect(
    page.locator(
      'form.schedule-form[data-hydrated="true"], form.result-form[data-hydrated="true"]',
    ),
  ).toBeVisible();
}

/** The form feedback panel, excluding the Next.js route announcer. */
export function formFeedback(page: Page) {
  return page.locator(".form-feedback");
}

/** Field-level and panel-level error text raised by a server action. */
export function formErrors(page: Page) {
  return page.locator(".form-feedback--error, .form-feedback--conflict, .form-error");
}

/** Fails when the page itself scrolls sideways at a narrow phone width. */
export async function expectNoHorizontalPageOverflow(
  page: Page,
): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
    };
  });

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}
