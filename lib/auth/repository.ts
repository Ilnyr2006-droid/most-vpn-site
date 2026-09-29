import type { Session, User, VerificationChallenge } from "@/lib/models";
export interface AuthRepository { findUserByPhone(phone: string): Promise<User | null>; findUserById(id: string): Promise<User | null>; createUser(phone: string): Promise<User>; markUserPhoneVerified(userId: string): Promise<User>; }
export interface SessionRepository { createSession(session: Session): Promise<void>; findByTokenHash(tokenHash: string): Promise<Session | null>; revoke(id: string): Promise<void>; }
export interface VerificationChallengeRepository { createChallenge(challenge: VerificationChallenge): Promise<void>; find(id: string): Promise<VerificationChallenge | null>; save(challenge: VerificationChallenge): Promise<void>; }
export interface RateLimitStore { check(key: string, limit: number, windowMs: number): Promise<boolean>; }
class InMemoryAuthRepository implements AuthRepository, SessionRepository, VerificationChallengeRepository, RateLimitStore {
  private users = new Map<string, User>(); private sessions = new Map<string, Session>(); private challenges = new Map<string, VerificationChallenge>(); private limits = new Map<string, number[]>();
  async findUserByPhone(phone: string) { return this.users.get(phone) ?? null; }
  async findUserById(id: string) { return [...this.users.values()].find(user => user.id === id) ?? null; }
  async createUser(phone: string) { const user: User = { id: `usr_${crypto.randomUUID()}`, phone, phoneVerifiedAt: new Date().toISOString(), email: null, telegramId: null, createdAt: new Date().toISOString() }; this.users.set(phone, user); return user; }
  async markUserPhoneVerified(userId: string) { const user = await this.findUserById(userId); if (!user) throw new Error("User not found"); user.phoneVerifiedAt = new Date().toISOString(); this.users.set(user.phone, user); return user; }
  async createSession(session: Session) { this.sessions.set(session.id, session); }
  async findByTokenHash(tokenHash: string) { return [...this.sessions.values()].find(session => session.tokenHash === tokenHash) ?? null; }
  async revoke(id: string) { const session = this.sessions.get(id); if (session) { session.revokedAt = new Date().toISOString(); this.sessions.set(id, session); } }
  async createChallenge(challenge: VerificationChallenge) { this.challenges.set(challenge.id, challenge); }
  async find(id: string) { return this.challenges.get(id) ?? null; }
  async save(challenge: VerificationChallenge) { this.challenges.set(challenge.id, challenge); }
  async check(key: string, limit: number, windowMs: number) { const now = Date.now(); const recent = (this.limits.get(key) ?? []).filter(time => now - time < windowMs); if (recent.length >= limit) { this.limits.set(key, recent); return false; } recent.push(now); this.limits.set(key, recent); return true; }
}
const globalStore = globalThis as unknown as { mostAuthStore?: InMemoryAuthRepository };
export const authStore = globalStore.mostAuthStore ?? new InMemoryAuthRepository(); globalStore.mostAuthStore = authStore;
