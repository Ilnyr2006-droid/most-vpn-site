import { getPostgresPool } from "@/lib/db/postgres";
import type { Session, User, VerificationChallenge } from "@/lib/models";
import type { AuthRepository, RateLimitStore, SessionRepository, VerificationChallengeRepository } from "@/lib/auth/repository";

function iso(value: Date | string) {
  return new Date(value).toISOString();
}

function user(row: any): User {
  return {
    id: row.id,
    phone: row.phone,
    phoneVerifiedAt: iso(row.phone_verified_at),
    email: row.email,
    telegramId: row.telegram_id,
    createdAt: iso(row.created_at),
  };
}

function session(row: any): Session {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    createdAt: iso(row.created_at),
    expiresAt: iso(row.expires_at),
    revokedAt: row.revoked_at ? iso(row.revoked_at) : null,
  };
}

function challenge(row: any): VerificationChallenge {
  return {
    id: row.id,
    phone: row.phone,
    codeHash: row.code_hash,
    channel: row.channel,
    expiresAt: iso(row.expires_at),
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    lastSentAt: iso(row.last_sent_at),
    usedAt: row.used_at ? iso(row.used_at) : null,
    providerRequestId: row.provider_request_id,
    createdAt: iso(row.created_at),
  };
}

export const postgresAuthStore: AuthRepository & SessionRepository & VerificationChallengeRepository & RateLimitStore = {
  async findUserByPhone(phone) {
    const r = await getPostgresPool().query("SELECT * FROM auth_users WHERE phone=$1 LIMIT 1", [phone]);
    return r.rows[0] ? user(r.rows[0]) : null;
  },
  async findUserById(id) {
    const r = await getPostgresPool().query("SELECT * FROM auth_users WHERE id=$1 LIMIT 1", [id]);
    return r.rows[0] ? user(r.rows[0]) : null;
  },
  async createUser(phone) {
    const r = await getPostgresPool().query(
      "INSERT INTO auth_users(id,phone,phone_verified_at,created_at) VALUES($1,$2,NOW(),NOW()) ON CONFLICT(phone) DO UPDATE SET phone=EXCLUDED.phone RETURNING *",
      [`usr_${crypto.randomUUID()}`, phone]
    );
    return user(r.rows[0]);
  },
  async markUserPhoneVerified(id) {
    const r = await getPostgresPool().query("UPDATE auth_users SET phone_verified_at=NOW() WHERE id=$1 RETURNING *", [id]);
    return user(r.rows[0]);
  },
  async createSession(value) {
    await getPostgresPool().query("INSERT INTO auth_sessions(id,user_id,token_hash,created_at,expires_at,revoked_at) VALUES($1,$2,$3,$4,$5,$6)", [value.id,value.userId,value.tokenHash,value.createdAt,value.expiresAt,value.revokedAt]);
  },
  async findByTokenHash(hash) {
    const r = await getPostgresPool().query("SELECT * FROM auth_sessions WHERE token_hash=$1 LIMIT 1", [hash]);
    return r.rows[0] ? session(r.rows[0]) : null;
  },
  async revoke(id) {
    await getPostgresPool().query("UPDATE auth_sessions SET revoked_at=NOW() WHERE id=$1", [id]);
  },
  async createChallenge(value) {
    await getPostgresPool().query("INSERT INTO auth_challenges(id,phone,code_hash,channel,expires_at,attempts,max_attempts,last_sent_at,used_at,provider_request_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [value.id,value.phone,value.codeHash,value.channel,value.expiresAt,value.attempts,value.maxAttempts,value.lastSentAt,value.usedAt,value.providerRequestId,value.createdAt]);
  },
  async find(id) {
    const r = await getPostgresPool().query("SELECT * FROM auth_challenges WHERE id=$1 LIMIT 1", [id]);
    return r.rows[0] ? challenge(r.rows[0]) : null;
  },
  async consumeVerifiedChallenge(id, codeHash) {
    const r = await getPostgresPool().query(
      "UPDATE auth_challenges SET used_at=NOW() WHERE id=$1 AND used_at IS NULL AND code_hash=$2 AND expires_at>NOW() AND attempts<max_attempts RETURNING *",
      [id, codeHash]
    );
    return r.rows[0] ? challenge(r.rows[0]) : null;
  },
  async recordFailedChallengeAttempt(id) {
    const r = await getPostgresPool().query(
      "UPDATE auth_challenges SET attempts=attempts+1 WHERE id=$1 AND used_at IS NULL AND expires_at>NOW() AND attempts<max_attempts RETURNING *",
      [id]
    );
    return r.rows[0] ? challenge(r.rows[0]) : null;
  },
  async check(key, limit, windowMs) {
    const r = await getPostgresPool().query(
      `INSERT INTO auth_rate_limits(key,count,reset_at) VALUES($1,1,NOW()+($2::bigint*INTERVAL '1 millisecond')) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_rate_limits.reset_at<=NOW() THEN 1 ELSE auth_rate_limits.count+1 END, reset_at=CASE WHEN auth_rate_limits.reset_at<=NOW() THEN NOW()+($2::bigint*INTERVAL '1 millisecond') ELSE auth_rate_limits.reset_at END RETURNING count`,
      [key, windowMs]
    );
    return Number(r.rows[0].count) <= limit;
  },
};
