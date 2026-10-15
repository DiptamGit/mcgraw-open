import { expect, test } from "@playwright/test";

import { tournamentSnapshotSchema } from "../lib/data/schema";
import { z } from "zod";
import { executeLocalSql, queryLocalSql, resetLocalSupabaseDatabase } from "./support/local-supabase";
import { expectNoHorizontalPageOverflow, unlockOrganizerMode } from "./support/organizer";

const endpoint = "/organizer/reconcile-2026-knockout";
const groupFingerprint = () => queryLocalSql(`
  select md5(jsonb_agg(to_jsonb(match) order by id)::text)
  from public.matches as match where stage = 'group';
`);

test("reconciles approved evidence once without rewriting group history", async ({ page }) => {
  executeLocalSql(`
    update public.matches set status = 'completed', outcome_type = 'normal',
      deciding_set_format = 'full_set', sets = '[[6,4],[6,4]]',
      winner_id = team1_id, played_at = '2026-10-01T23:00:00Z',
      completed_at = statement_timestamp()
    where stage = 'group';
  `);
  const before = groupFingerprint();
  try {
    await page.goto("/");
    const headers = { origin: new URL(page.url()).origin };
    expect((await page.request.post(endpoint, { headers, data: { intent: "preview" } })).status()).toBe(403);
    await unlockOrganizerMode(page);
    expect((await page.request.post(endpoint, {
      headers: { origin: "https://untrusted.example" }, data: { intent: "preview" },
    })).status()).toBe(403);

    const previewResponse = await page.request.post(endpoint, { headers, data: { intent: "preview" } });
    expect(previewResponse.status()).toBe(200);
    const preview = z.object({
      reconciliationId: z.literal("MGO-033"),
      expectedSnapshot: tournamentSnapshotSchema,
    }).parse(await previewResponse.json());
    const apply = {
      ...preview, intent: "apply",
      confirmation: "Apply the reviewed MGO-033 reconciliation",
    };
    const attempts = await Promise.all([
      page.request.post(endpoint, { headers, data: apply }),
      page.request.post(endpoint, { headers, data: apply }),
    ]);
    expect(attempts.map((attempt) => attempt.status()).sort()).toEqual([200, 409]);
    expect(groupFingerprint()).toBe(before);
    expect((await page.request.post(endpoint, { headers, data: apply })).status()).toBe(409);
    expect(queryLocalSql(`
      select count(*) from public.audit_log
      where entity_type = 'tournament_reconciliation' and entity_key = 'MGO-033';
    `)).toBe("1");

    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/bracket");
    for (const [code, teams, sources] of [
      ["SF1", ["Giri / Srini", "Amit Gupta / Jeet"], ["Winner QF4", "Winner QF1"]],
      ["SF2", ["Ranjit / Venu C", "Prasad V / Srinivas"], ["Winner QF3", "Winner QF2"]],
    ] as const) {
      const match = page.getByRole("article", { name: new RegExp(`^${code}:`) });
      for (const value of [...teams, ...sources, "Unscheduled"]) {
        await expect(match.getByText(value, { exact: true })).toBeVisible();
      }
    }
    await expectNoHorizontalPageOverflow(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await expectNoHorizontalPageOverflow(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.reload();
    await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
    await expectNoHorizontalPageOverflow(page);
    await page.evaluate(() => { document.documentElement.style.zoom = ""; });

    await page.goto("/groups");
    await expect(page.getByText("Rally Rascals", { exact: true })).toBeVisible();
    await expect(page.getByText("Withdrawn", { exact: true })).toHaveCount(3);
    await expect(page.getByText("The final group order is locked in for the knockout draw.")).toBeVisible();
    await page.goto("/matches?stage=quarterfinal");
    await expect(page.getByRole("listitem").filter({ hasText: "Court BHS" })).toHaveCount(4);
    await page.goto("/");
    await expect(page.getByText(/Quarterfinal winners are seeded by quarterfinal set-win percentage/)).toBeVisible();
  } finally {
    resetLocalSupabaseDatabase();
  }
});

test("rejects a changed reviewed baseline without partial reconciliation", async ({ page }) => {
  executeLocalSql(`
    update public.matches set status = 'completed', outcome_type = 'normal',
      deciding_set_format = 'full_set', sets = '[[6,4],[6,4]]',
      winner_id = team1_id, played_at = '2026-10-01T23:00:00Z',
      completed_at = statement_timestamp()
    where stage = 'group';
  `);
  try {
    await unlockOrganizerMode(page);
    const headers = { origin: new URL(page.url()).origin };
    const response = await page.request.post(endpoint, { headers, data: { intent: "preview" } });
    const preview = z.object({
      reconciliationId: z.literal("MGO-033"),
      expectedSnapshot: tournamentSnapshotSchema,
    }).parse(await response.json());
    executeLocalSql(`update public.matches set scheduled_at = played_at, venue = 'Changed court' where code = 'GA-01';`);
    const result = await page.request.post(endpoint, { headers, data: {
      ...preview, intent: "apply", confirmation: "Apply the reviewed MGO-033 reconciliation",
    } });
    expect(result.status()).toBe(409);
    expect(queryLocalSql(`select count(*) from public.teams where final_rank is not null;`)).toBe("0");
    expect(queryLocalSql(`select count(*) from public.matches where stage <> 'group' and team1_id is not null;`)).toBe("0");
  } finally {
    resetLocalSupabaseDatabase();
  }
});
