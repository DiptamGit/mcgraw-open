import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrganizerEnvironment } from "@/lib/auth/environment";
import {
  OrganizerRateLimitError,
  recordOrganizerUnlockAttempt,
} from "@/lib/auth/rate-limit";
import {
  getPrivateUnlockClientKey,
  hasSameMutationOrigin,
} from "@/lib/auth/request";
import {
  createOrganizerSessionToken,
  ORGANIZER_COOKIE_NAME,
  organizerCookieOptions,
  pinMatches,
} from "@/lib/auth/session";

export const runtime = "nodejs";

const sessionRequestSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("unlock"),
    pin: z.string().min(4).max(128),
    returnTo: z.string(),
  }),
  z.object({
    intent: z.literal("lock"),
    returnTo: z.string(),
  }),
]);

function safeReturnTo(value: string): string {
  return value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/matches";
}

function redirectWithError(
  request: NextRequest,
  returnTo: string,
  error: "invalid" | "limited" | "unavailable",
  retryAfterSeconds?: number,
): NextResponse {
  const destination = new URL("/organizer/unlock", request.url);
  destination.searchParams.set("returnTo", returnTo);
  destination.searchParams.set("error", error);

  if (retryAfterSeconds !== undefined) {
    destination.searchParams.set("retry", String(retryAfterSeconds));
  }

  return NextResponse.redirect(destination, 303);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!hasSameMutationOrigin(request)) {
    return new NextResponse("Cross-origin request rejected.", { status: 403 });
  }

  const formData = await request.formData();
  const parsedRequest = sessionRequestSchema.safeParse({
    intent: formData.get("intent"),
    pin: formData.get("pin"),
    returnTo: formData.get("returnTo") ?? "/matches",
  });

  if (!parsedRequest.success) {
    return redirectWithError(request, "/matches", "invalid");
  }

  const returnTo = safeReturnTo(parsedRequest.data.returnTo);

  if (parsedRequest.data.intent === "lock") {
    const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
    response.cookies.set(ORGANIZER_COOKIE_NAME, "", {
      ...organizerCookieOptions(),
      maxAge: 0,
    });
    return response;
  }

  const environment = getOrganizerEnvironment();
  const clientKey = getPrivateUnlockClientKey(request, environment);

  if (!clientKey) {
    return redirectWithError(request, returnTo, "unavailable");
  }

  const pinIsCorrect = pinMatches(
    parsedRequest.data.pin,
    environment.ORGANIZER_PIN,
  );

  let rateLimit;
  try {
    rateLimit = await recordOrganizerUnlockAttempt(clientKey, pinIsCorrect);
  } catch (error) {
    if (error instanceof OrganizerRateLimitError) {
      return redirectWithError(request, returnTo, "unavailable");
    }

    throw error;
  }

  if (!rateLimit.allowed) {
    return redirectWithError(
      request,
      returnTo,
      "limited",
      rateLimit.retryAfterSeconds,
    );
  }

  if (!pinIsCorrect) {
    return redirectWithError(request, returnTo, "invalid");
  }

  const token = await createOrganizerSessionToken(environment);
  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(
    ORGANIZER_COOKIE_NAME,
    token,
    organizerCookieOptions(),
  );

  return response;
}
