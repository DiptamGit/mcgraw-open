import "server-only";

import { cookies, headers } from "next/headers";

import {
  OrganizerAuthorizationError,
  hasSameMutationOrigin,
} from "./request";
import {
  ORGANIZER_COOKIE_NAME,
  verifyOrganizerSessionToken,
} from "./session";

function firstHeaderValue(value: string | null): string | null {
  const firstValue = value?.split(",")[0]?.trim();
  return firstValue || null;
}

export async function requireOrganizerServerAction(): Promise<void> {
  const [requestHeaders, cookieStore] = await Promise.all([
    headers(),
    cookies(),
  ]);
  const host =
    firstHeaderValue(requestHeaders.get("x-forwarded-host")) ??
    firstHeaderValue(requestHeaders.get("host"));

  if (!host) {
    throw new OrganizerAuthorizationError("Request host is missing.");
  }

  const protocol =
    firstHeaderValue(requestHeaders.get("x-forwarded-proto")) ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const forwardedHeaders = new Headers();
  requestHeaders.forEach((value, key) => {
    forwardedHeaders.set(key, value);
  });

  let request: Request;
  try {
    request = new Request(`${protocol}://${host}/`, {
      headers: forwardedHeaders,
    });
  } catch {
    throw new OrganizerAuthorizationError("Request origin is invalid.");
  }

  if (!hasSameMutationOrigin(request)) {
    throw new OrganizerAuthorizationError("Cross-origin request rejected.");
  }

  const token = cookieStore.get(ORGANIZER_COOKIE_NAME)?.value;
  if (!token || !(await verifyOrganizerSessionToken(token))) {
    throw new OrganizerAuthorizationError();
  }
}
