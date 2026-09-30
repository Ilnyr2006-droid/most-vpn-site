import { getPostgresPool, hasDatabase } from "@/lib/db/postgres";

type RateRule = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type MemoryBucket = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __mostDevRateBuckets: Map<string, MemoryBucket> | undefined;
}

const memoryBuckets =
  globalThis.__mostDevRateBuckets ?? new Map<string, MemoryBucket>();

globalThis.__mostDevRateBuckets = memoryBuckets;

export class RateLimitUnavailableError extends Error {
  constructor(message = "Distributed rate limiting is unavailable") {
    super(message);
    this.name = "RateLimitUnavailableError";
  }
}

function memoryCheck(rule: RateRule): RateResult {
  const now = Date.now();
  const current = memoryBuckets.get(rule.key);

  if (!current || current.resetAt <= now) {
    memoryBuckets.set(rule.key, {
      count: 1,
      resetAt: now + rule.windowMs,
    });
    return {
      ok: true,
      remaining: Math.max(0, rule.limit - 1),
      retryAfterSeconds: 0,
    };
  }

  current.count += 1;

  if (current.count > rule.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000)
      ),
    };
  }

  return {
    ok: true,
    remaining: Math.max(0, rule.limit - current.count),
    retryAfterSeconds: 0,
  };
}

async function postgresCheck(rule: RateRule): Promise<RateResult> {
  const pool = getPostgresPool();

  const result = await pool.query<{
    count: number;
    reset_at: Date | string;
  }>(
    `
      INSERT INTO request_rate_limits (key, count, reset_at)
      VALUES (
        $1,
        1,
        NOW() + ($2::bigint * INTERVAL '1 millisecond')
      )
      ON CONFLICT (key) DO UPDATE
      SET
        count = CASE
          WHEN request_rate_limits.reset_at <= NOW() THEN 1
          ELSE request_rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN request_rate_limits.reset_at <= NOW()
            THEN NOW() + ($2::bigint * INTERVAL '1 millisecond')
          ELSE request_rate_limits.reset_at
        END
      RETURNING count, reset_at
    `,
    [rule.key, rule.windowMs]
  );

  const row = result.rows[0];
  const count = Number(row.count);
  const resetAt = new Date(row.reset_at).getTime();
  const ok = count <= rule.limit;

  return {
    ok,
    remaining: ok ? Math.max(0, rule.limit - count) : 0,
    retryAfterSeconds: ok
      ? 0
      : Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
  };
}

async function check(rule: RateRule): Promise<RateResult> {
  if (hasDatabase()) {
    try {
      return await postgresCheck(rule);
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        throw new RateLimitUnavailableError(
          "PostgreSQL rate limiter failed; request rejected"
        );
      }
      return memoryCheck(rule);
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new RateLimitUnavailableError(
      "DATABASE_URL is required for distributed production rate limiting"
    );
  }

  return memoryCheck(rule);
}

export async function enforceRateLimits(
  rules: RateRule[]
): Promise<RateResult> {
  for (const rule of rules) {
    const result = await check(rule);
    if (!result.ok) return result;
  }

  return {
    ok: true,
    remaining: 0,
    retryAfterSeconds: 0,
  };
}
