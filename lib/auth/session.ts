import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthSession, Session, User } from "@/lib/models";
import { authStore } from "@/lib/auth/repository";
import { createSessionToken, hashSessionToken } from "@/lib/auth/service";
export const cookieName = process.env.AUTH_COOKIE_NAME ?? "most_session";
const maxAge = 60 * 60 * 24 * 30;
export const sessionCookie = (token: string) => ({ name: cookieName, value: token, options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge } });
export async function createSession(user: User) { const token = createSessionToken(); const now = new Date(); const session: Session = { id: `ses_${crypto.randomUUID()}`, userId: user.id, tokenHash: hashSessionToken(token), createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + maxAge * 1000).toISOString(), revokedAt: null }; await authStore.createSession(session); return { session, token }; }
export async function getAuthSession(): Promise<AuthSession | null> { const token = (await cookies()).get(cookieName)?.value; if (!token) return null; const session = await authStore.findByTokenHash(hashSessionToken(token)); if (!session || session.revokedAt || new Date(session.expiresAt) < new Date()) return null; const user = await authStore.findUserById(session.userId); return user ? { session, user } : null; }
export async function requireSession() { const current = await getAuthSession(); if (!current) redirect("/auth"); return current; }
