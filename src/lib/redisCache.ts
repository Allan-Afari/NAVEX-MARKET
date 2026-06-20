/**
 * REDIS CACHE IMPLEMENTATION
 * Production-ready caching layer for Navex Market
 */

import Redis from "ioredis";

// Initialize Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: false,
});

// Handle connection events
redis.on("error", (error) => {
  console.error("Redis connection error:", error);
});

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("ready", () => {
  console.log("Redis ready for commands");
});

// ============================================
// CACHE CONFIGURATION
// ============================================

export const CACHE_KEYS = {
  // Deal-related caches
  DEAL_METRICS: "deal:metrics:all",
  DEAL_BY_ID: (id: string) => `deal:${id}`,
  DEALS_LIST: (page: number) => `deals:list:${page}`,
  DEALS_SEARCH: (query: string) => `deals:search:${btoa(query)}`,
  DEAL_STAGE_DISTRIBUTION: "deal:stage:distribution",

  // Portfolio-related caches
  USER_PORTFOLIOS: (userId: string) => `portfolio:user:${userId}`,
  PORTFOLIO_BY_ID: (id: string) => `portfolio:${id}`,
  PORTFOLIO_PERFORMANCE: (id: string) => `portfolio:performance:${id}`,
  PORTFOLIO_EXITS: (id: string) => `portfolio:exits:${id}`,

  // User-related caches
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_ANALYTICS: (userId: string) => `user:analytics:${userId}`,
  USER_TRUST_SCORE: (userId: string) => `user:trust:${userId}`,

  // Analytics caches
  MARKET_SENTIMENT: "market:sentiment",
  TREND_DATA: (metric: string, days: number) =>
    `trend:${metric}:${days}d`,
  CONCENTRATION_HEATMAP: "market:heatmap",
  DEAL_SUCCESS_PREDICTION: (dealId: string) =>
    `predict:success:${dealId}`,

  // Activity caches
  DEAL_ACTIVITY: (dealRoomId: string) =>
    `activity:room:${dealRoomId}`,
  RECENT_ACTIVITIES: "activities:recent",

  // Rate limiting caches
  RATE_LIMIT: (userId: string, endpoint: string) =>
    `ratelimit:${userId}:${endpoint}`,

  // Feature flags
  FEATURE_FLAGS: "flags:all",
};

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
  NEVER_EXPIRE: 0,
};

// ============================================
// CACHE WRAPPER FUNCTION
// ============================================

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log(`Cache HIT: ${key}`);
      return JSON.parse(cached);
    }
    console.log(`Cache MISS: ${key}`);
    return null;
  } catch (error) {
    console.error(`Cache retrieval error for ${key}:`, error);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttl: number = CACHE_TTL.LONG
): Promise<boolean> {
  try {
    const serialized = JSON.stringify(value);
    if (ttl === 0) {
      await redis.set(key, serialized);
    } else {
      await redis.setex(key, ttl, serialized);
    }
    console.log(`Cache SET: ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    console.error(`Cache write error for ${key}:`, error);
    return false;
  }
}

export async function cacheInvalidate(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;

    const deleted = await redis.del(...keys);
    console.log(
      `Cache INVALIDATE: ${pattern} (${deleted} keys deleted)`
    );
    return deleted;
  } catch (error) {
    console.error(`Cache invalidation error for ${pattern}:`, error);
    return 0;
  }
}

export async function cacheWrapper<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_TTL.LONG
): Promise<T> {
  // Try to get from cache
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch from source
  const data = await fetchFn();

  // Store in cache
  await cacheSet(key, data, ttl);

  return data;
}

export async function cacheInvalidateBatch(
  patterns: string[]
): Promise<number> {
  let total = 0;
  for (const pattern of patterns) {
    total += await cacheInvalidate(pattern);
  }
  return total;
}

// ============================================
// BATCH CACHE OPERATIONS
// ============================================

export async function cacheGetBatch<T>(
  keys: string[]
): Promise<(T | null)[]> {
  try {
    const values = await redis.mget(...keys);
    return values.map((v) => (v ? JSON.parse(v) : null));
  } catch (error) {
    console.error("Batch cache retrieval error:", error);
    return keys.map(() => null);
  }
}

export async function cacheSetBatch<T>(
  items: Array<{ key: string; value: T; ttl?: number }>
): Promise<boolean> {
  try {
    const pipeline = redis.pipeline();
    for (const { key, value, ttl = CACHE_TTL.LONG } of items) {
      const serialized = JSON.stringify(value);
      if (ttl === 0) {
        pipeline.set(key, serialized);
      } else {
        pipeline.setex(key, ttl, serialized);
      }
    }
    await pipeline.exec();
    console.log(`Cache SET BATCH: ${items.length} items`);
    return true;
  } catch (error) {
    console.error("Batch cache write error:", error);
    return false;
  }
}

// ============================================
// RATE LIMITING WITH CACHE
// ============================================

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = CACHE_KEYS.RATE_LIMIT(userId, endpoint);

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      // First request in window, set expiration
      await redis.expire(key, windowSeconds);
    }

    const resetAt = Math.ceil(Date.now() / 1000) + windowSeconds;
    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);

    console.log(
      `Rate limit check: ${userId}:${endpoint} - ${current}/${limit}`
    );

    return { allowed, remaining, resetAt };
  } catch (error) {
    console.error("Rate limit check error:", error);
    return { allowed: true, remaining: limit, resetAt: 0 };
  }
}

// ============================================
// CACHE STATISTICS & MONITORING
// ============================================

export async function getCacheStats(): Promise<{
  keys: number;
  memory: string;
  hits: number;
  misses: number;
}> {
  try {
    const info = await redis.info("stats");
    const keys = await redis.dbsize();

    const lines = info.split("\r\n");
    const stats: Record<string, string> = {};

    for (const line of lines) {
      const [key, value] = line.split(":");
      if (key && value) {
        stats[key] = value;
      }
    }

    return {
      keys: keys,
      memory: stats.used_memory_human || "N/A",
      hits: parseInt(stats.keyspace_hits || "0"),
      misses: parseInt(stats.keyspace_misses || "0"),
    };
  } catch (error) {
    console.error("Cache stats error:", error);
    return { keys: 0, memory: "N/A", hits: 0, misses: 0 };
  }
}

export async function flushCache(): Promise<void> {
  try {
    await redis.flushdb();
    console.log("Cache flushed");
  } catch (error) {
    console.error("Cache flush error:", error);
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: Simple cache wrapper
export async function getDealMetricsWithCache() {
  return cacheWrapper(
    CACHE_KEYS.DEAL_METRICS,
    async () => {
      // Expensive database query
      const metrics = await queryDealMetrics();
      return metrics;
    },
    CACHE_TTL.MEDIUM // 5 minutes
  );
}

// Example 2: Cache with invalidation
export async function updateDealWithCache(
  dealId: string,
  updates: any
) {
  const { data, error } = await updateDeal(dealId, updates);

  if (!error) {
    // Invalidate related caches
    await cacheInvalidateBatch([
      CACHE_KEYS.DEAL_BY_ID(dealId),
      `${CACHE_KEYS.DEALS_LIST}:*`,
      `${CACHE_KEYS.DEALS_SEARCH}:*`,
      CACHE_KEYS.DEAL_METRICS,
    ]);
  }

  return { data, error };
}

// Example 3: Cache with rate limiting
export async function apiEndpointWithRateLimit(
  userId: string,
  handler: () => Promise<any>
) {
  const rateLimit = await checkRateLimit(
    userId,
    "api.endpoint",
    1000,
    60
  );

  if (!rateLimit.allowed) {
    return {
      status: 429,
      headers: { "Retry-After": rateLimit.resetAt },
      error: "Too many requests",
    };
  }

  return handler();
}

// Example 4: Batch cache operations
export async function getMultipleDealsWithCache(dealIds: string[]) {
  const keys = dealIds.map((id) => CACHE_KEYS.DEAL_BY_ID(id));
  const cachedDeals = await cacheGetBatch<any>(keys);

  // Fetch missing deals
  const missingIndexes = cachedDeals
    .map((d, i) => (d === null ? i : -1))
    .filter((i) => i !== -1);

  if (missingIndexes.length > 0) {
    const missingIds = missingIndexes.map((i) => dealIds[i]);
    const missingDeals = await queryDealsByIds(missingIds);

    // Cache missing deals
    await cacheSetBatch(
      missingDeals.map((deal) => ({
        key: CACHE_KEYS.DEAL_BY_ID(deal.id),
        value: deal,
        ttl: CACHE_TTL.LONG,
      }))
    );

    // Update result array
    missingIndexes.forEach((originalIndex, i) => {
      cachedDeals[originalIndex] = missingDeals[i];
    });
  }

  return cachedDeals;
}

// ============================================
// CLEANUP ON SHUTDOWN
// ============================================

export async function closeRedisConnection(): Promise<void> {
  try {
    await redis.quit();
    console.log("Redis connection closed");
  } catch (error) {
    console.error("Redis close error:", error);
  }
}

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing Redis connection");
  await closeRedisConnection();
  process.exit(0);
});

export default redis;
