import { NextRequest, NextResponse } from "next/server";

const isDevelopment = process.env.NODE_ENV === "development";

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function contentSecurityPolicy(nonce: string, isSecureRequest: boolean): string {
  // `'strict-dynamic'` is deliberately omitted. It makes browsers ignore
  // `'self'`, so any nonce mismatch between a prefetched payload and the
  // rendered document would silently break client navigation.
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    isDevelopment ? "'unsafe-eval'" : null,
  ].filter((source): source is string => source !== null);

  const directives = [
    // `connect-src` is intentionally left to the `default-src` fallback.
    // WebKit blocks Next.js RSC and server-action fetches ("access control
    // checks") when both directives are declared, which breaks organizer
    // updates on iOS Safari. Development also allows the HMR websocket.
    isDevelopment ? "default-src 'self' ws: wss:" : "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    // Next.js and React insert inline style attributes and critical style
    // elements that cannot carry a nonce, so inline styles stay allowed while
    // scripts remain nonce-restricted.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    // Only meaningful on an HTTPS origin. Sending it over plain HTTP breaks
    // local and end-to-end runs in browsers that upgrade loopback requests.
    isSecureRequest ? "upgrade-insecure-requests" : null,
  ].filter((directive): directive is string => directive !== null);

  return directives.join("; ");
}

function isSecureRequest(request: NextRequest): boolean {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  return (
    (forwardedProtocol ?? request.nextUrl.protocol.replace(":", "")) === "https"
  );
}

export function proxy(request: NextRequest): NextResponse {
  const nonce = createNonce();
  const policy = contentSecurityPolicy(nonce, isSecureRequest(request));

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", policy);

  return response;
}

export const config = {
  // Prefetches are included so every navigation payload carries a policy.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|txt|xml|webmanifest)$).*)",
  ],
};
