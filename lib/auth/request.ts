import "server-only";

import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

import type { OrganizerEnvironment } from "./environment";
import {
  ORGANIZER_COOKIE_NAME,
  verifyOrganizerSessionToken,
} from "./session";

export class OrganizerAuthorizationError extends Error {
  constructor(message = "Organizer authorization is required.") {
    super(message);
    this.name = "OrganizerAuthorizationError";
  }
}

function firstHeaderValue(value: string | null): string | null {
  const firstValue = value?.split(",")[0]?.trim();
  return firstValue || null;
}

export function hasSameMutationOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  try {
    const requestUrl = new URL(request.url);
    const forwardedHost = firstHeaderValue(
      request.headers.get("x-forwarded-host"),
    );
    const host = forwardedHost ?? firstHeaderValue(request.headers.get("host"));
    const forwardedProtocol = firstHeaderValue(
      request.headers.get("x-forwarded-proto"),
    );
    const protocol = forwardedProtocol ?? requestUrl.protocol.replace(":", "");
    const expectedOrigin = host
      ? new URL(`${protocol}://${host}`).origin
      : requestUrl.origin;

    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

export function getPrivateUnlockClientKey(
  request: Request,
  environment: OrganizerEnvironment,
): string | null {
  const clientAddress =
    firstHeaderValue(request.headers.get("x-vercel-forwarded-for")) ??
    firstHeaderValue(request.headers.get("x-forwarded-for")) ??
    firstHeaderValue(request.headers.get("x-real-ip"));

  if (!clientAddress) {
    return null;
  }

  return createHmac("sha256", environment.ORGANIZER_COOKIE_SECRET)
    .update("mcgraw-open:unlock-client:")
    .update(clientAddress)
    .digest("hex");
}

export async function requireOrganizerMutation(
  request: NextRequest,
): Promise<void> {
  if (!hasSameMutationOrigin(request)) {
    throw new OrganizerAuthorizationError("Cross-origin request rejected.");
  }

  const token = request.cookies.get(ORGANIZER_COOKIE_NAME)?.value;
  if (!token || !(await verifyOrganizerSessionToken(token))) {
    throw new OrganizerAuthorizationError();
  }
}
