import type { Session, User, VerificationChallenge } from "@/lib/models";
import { hasDatabase } from "@/lib/db/postgres";
import { postgresAuthStore } from "@/lib/auth/repository-postgres";

export interface AuthRepository { findUserByPhone(phone: string): Promise<User | null>; findUserById(id: string): Promise<User | null>; listUsers(limit: number): Promise<User[]>; createUser(phone: string): Promise<User>; markUserPhoneVerified(userId: string): Promise<User>; consumeVerifiedChallenge(id: string, codeHash: string): Promise<VerificationChallenge | null>; recordFailedChallengeAttempt(id: string): Promise<VerificationChallenge | null>; }
export interface SessionRepository { createSession(session: Session): Promise<void>; findByTokenHash(tokenHash: string): Promise<Session | null>; revoke(id: string): Promise<void>; }
export interface VerificationChallengeRepository { createChallenge(challenge: VerificationChallenge): Promise<void>; find(id: string): Promise<VerificationChallenge | null>; }
export interface RateLimitStore { check(key: string, limit: number, windowMs: number): Promise<boolean>; }

class InMemoryAuthRepository implements AuthRepository, SessionRepository, VerificationChallengeRepository, RateLimitStore {
  private users = new Map<string, User>();
  private sessions = new Map<string, Session>();
  private challenges = new Map<string, VerificationChallenge>();
  private limits = new Map<string, number[]>();
  async findUserByPhone(phone:string){return this.users.get(phone)??null;}
  async findUserById(id:string){return [...this.users.values()].find(v=>v.id===id)??null;}
  async listUsers(limit:number){return [...this.users.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,limit);}
  async createUser(phone:string){const u={id:`usr_${crypto.randomUUID()}`,phone,phoneVerifiedAt:new Date().toISOString(),email:null,telegramId:null,createdAt:new Date().toISOString()};this.users.set(phone,u);return u;}
  async markUserPhoneVerified(id:string){const u=await this.findUserById(id);if(!u)throw new Error("User not found");u.phoneVerifiedAt=new Date().toISOString();return u;}
  async createSession(v:Session){this.sessions.set(v.id,v);}
  async findByTokenHash(v:string){return [...this.sessions.values()].find(s=>s.tokenHash===v)??null;}
  async revoke(id:string){const s=this.sessions.get(id);if(s)s.revokedAt=new Date().toISOString();}
  async createChallenge(v:VerificationChallenge){this.challenges.set(v.id,v);}
  async find(id:string){return this.challenges.get(id)??null;}
  async consumeVerifiedChallenge(id:string, codeHash:string){ const v=this.challenges.get(id); if(!v || v.usedAt || v.codeHash!==codeHash || new Date(v.expiresAt) <= new Date() || v.attempts >= v.maxAttempts) return null; v.usedAt=new Date().toISOString(); this.challenges.set(id,v); return v; }
  async recordFailedChallengeAttempt(id:string){ const v=this.challenges.get(id); if(!v || v.usedAt || new Date(v.expiresAt) <= new Date() || v.attempts >= v.maxAttempts) return null; v.attempts += 1; this.challenges.set(id,v); return v; }
  async check(key:string,limit:number,windowMs:number){const now=Date.now();const a=(this.limits.get(key)||[]).filter(x=>now-x<windowMs);if(a.length>=limit)return false;a.push(now);this.limits.set(key,a);return true;}
}

const memory = new InMemoryAuthRepository();

export const authStore = hasDatabase() ? postgresAuthStore : memory;

export function assertProductionAuthStorage() {
  if (process.env.NODE_ENV === "production" && !hasDatabase()) {
    throw new Error("DATABASE_URL is required for production auth");
  }
}
