import "server-only";

import { z } from "zod";

import { createPrivilegedSupabaseClient } from "../supabase/clients";

const rateLimitResultSchema = z
  .array(
    z.object({
      allowed: z.boolean(),
      retry_after_seconds: z.number().int().min(0).max(900),
    }),
  )
  .length(1);

export type UnlockRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export class OrganizerRateLimitError extends Error {
  constructor(options?: ErrorOptions) {
    super("Organizer unlock rate limiting is unavailable.", options);
    this.name = "OrganizerRateLimitError";
  }
}

export function parseUnlockRateLimitResult(
  value: unknown,
): UnlockRateLimitResult {
  const [result] = rateLimitResultSchema.parse(value);

  return {
    allowed: result.allowed,
    retryAfterSeconds: result.retry_after_seconds,
  };
}

export async function recordOrganizerUnlockAttempt(
  clientKey: string,
  wasSuccessful: boolean,
): Promise<UnlockRateLimitResult> {
  const client = createPrivilegedSupabaseClient();
  const { data, error } = await client.rpc("record_organizer_unlock_attempt", {
    p_client_key: clientKey,
    p_was_successful: wasSuccessful,
  });

  if (error) {
    throw new OrganizerRateLimitError({ cause: error });
  }

  try {
    return parseUnlockRateLimitResult(data);
  } catch (error) {
    throw new OrganizerRateLimitError({ cause: error });
  }
}
