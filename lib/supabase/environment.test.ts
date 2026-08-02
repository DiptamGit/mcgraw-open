import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("Supabase environment validation", () => {
  it("reports every missing public variable without exposing values", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;

    const { getPublicSupabaseEnvironment } = await import("./environment");

    expect(() => getPublicSupabaseEnvironment()).toThrow(
      "Invalid server configuration: SUPABASE_URL, SUPABASE_ANON_KEY are missing or invalid.",
    );
  });

  it("requires the service-role key only for privileged access", async () => {
    process.env.SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_ANON_KEY = "local-anon-key";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const {
      getPrivilegedSupabaseEnvironment,
      getPublicSupabaseEnvironment,
    } = await import("./environment");

    expect(getPublicSupabaseEnvironment()).toEqual({
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_ANON_KEY: "local-anon-key",
    });
    expect(() => getPrivilegedSupabaseEnvironment()).toThrow(
      "SUPABASE_SERVICE_ROLE_KEY is missing or invalid.",
    );
  });
});
