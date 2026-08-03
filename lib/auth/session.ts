import "server-only";

import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { errors, jwtVerify, SignJWT } from "jose";

import {
  getOrganizerEnvironment,
  type OrganizerEnvironment,
} from "./environment";

export const ORGANIZER_COOKIE_NAME = "mgo_organizer";
export const ORGANIZER_SESSION_SECONDS = 7 * 24 * 60 * 60;

const tokenIssuer = "mcgraw-open";
const tokenAudience = "mcgraw-open-organizer";

function getSigningKey(secret: string): Uint8Array {
  return createHash("sha256")
    .update("mcgraw-open:organizer-cookie:")
    .update(secret)
    .digest();
}

function getPinVersion(environment: OrganizerEnvironment): string {
  return createHmac("sha256", environment.ORGANIZER_COOKIE_SECRET)
    .update("mcgraw-open:pin-version:")
    .update(environment.ORGANIZER_PIN)
    .digest("base64url");
}

export function pinMatches(candidate: string, configuredPin: string): boolean {
  const candidateDigest = createHash("sha256").update(candidate).digest();
  const configuredDigest = createHash("sha256").update(configuredPin).digest();

  return timingSafeEqual(candidateDigest, configuredDigest);
}

export async function createOrganizerSessionToken(
  environment: OrganizerEnvironment = getOrganizerEnvironment(),
): Promise<string> {
  return new SignJWT({ pinVersion: getPinVersion(environment) })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(tokenIssuer)
    .setAudience(tokenAudience)
    .setSubject("organizer")
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${ORGANIZER_SESSION_SECONDS}s`)
    .sign(getSigningKey(environment.ORGANIZER_COOKIE_SECRET));
}

export async function verifyOrganizerSessionToken(
  token: string,
  environment: OrganizerEnvironment = getOrganizerEnvironment(),
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(
      token,
      getSigningKey(environment.ORGANIZER_COOKIE_SECRET),
      {
        algorithms: ["HS256"],
        issuer: tokenIssuer,
        audience: tokenAudience,
        subject: "organizer",
      },
    );

    const tokenPinVersion = payload.pinVersion;
    if (typeof tokenPinVersion !== "string") {
      return false;
    }

    const tokenVersionBuffer = Buffer.from(tokenPinVersion);
    const currentVersionBuffer = Buffer.from(getPinVersion(environment));

    return (
      tokenVersionBuffer.length === currentVersionBuffer.length &&
      timingSafeEqual(tokenVersionBuffer, currentVersionBuffer)
    );
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      return false;
    }

    throw error;
  }
}

export async function hasOrganizerSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ORGANIZER_COOKIE_NAME)?.value;

  return token ? verifyOrganizerSessionToken(token) : false;
}

export function organizerCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ORGANIZER_SESSION_SECONDS,
  };
}
