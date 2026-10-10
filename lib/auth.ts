import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@/app/generated/prisma/client";

const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error("AUTH_SECRET is not configured.");
}

const secretKey = new TextEncoder().encode(secret);

export const SESSION_COOKIE = "simplyire-session";

export type SessionPayload = {
  userId: string;
  role: Role;
  email: string;
  name: string;
};

export async function createSession(
  payload: SessionPayload
) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<
  SessionPayload | null
> {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get(
      SESSION_COOKIE
    )?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(
      token,
      secretKey
    );

    return {
      userId: String(payload.userId),
      role: payload.role as Role,
      email: String(payload.email),
      name: String(payload.name),
    };
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }

  return session;
}

export async function logout() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}