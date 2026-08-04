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

function firstHeaderValue(value: string | null): string | null {
  const firstValue = value?.split(",")[0]?.trim();
  return firstValue || null;
}

/**
 * Builds redirects from the validated request host so the organizer cookie is
 * always set and read on the same origin, including behind a proxy where the
 * internal request URL uses a different hostname.
 */
function requestOrigin(request: NextRequest): string {
  const requestUrl = new URL(request.url);
  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host"));

  if (!host) {
    return requestUrl.origin;
  }

  const protocol =
    firstHeaderValue(request.headers.get("x-forwarded-proto")) ??
    requestUrl.protocol.replace(":", "");

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return requestUrl.origin;
  }
}

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
  const destination = new URL("/organizer/unlock", requestOrigin(request));
  destination.searchParams.set("returnTo", returnTo);
  destination.searchParams.set("error", error);

  if (retryAfterSeconds !== undefined) {
    destination.searchParams.set("retry", String(retryAfterSeconds));
  }

  return NextResponse.redirect(destination, 303);
}

/**
 * Marks the organizer cookie Secure for every real deployment. Only a loopback
 * HTTP origin, used by local development and the end-to-end suite, opts out.
 */
function secureCookieForRequest(request: NextRequest): boolean {
  const { protocol, hostname } = new URL(requestOrigin(request));

  if (protocol === "https:") {
    return true;
  }

  const isLoopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost");

  return !isLoopback;
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
    const response = NextResponse.redirect(
      new URL(returnTo, requestOrigin(request)),
      303,
    );
    response.cookies.set(ORGANIZER_COOKIE_NAME, "", {
      ...organizerCookieOptions(secureCookieForRequest(request)),
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
  const response = NextResponse.redirect(
    new URL(returnTo, requestOrigin(request)),
    303,
  );
  response.cookies.set(
    ORGANIZER_COOKIE_NAME,
    token,
    organizerCookieOptions(secureCookieForRequest(request)),
  );

  return response;
}
