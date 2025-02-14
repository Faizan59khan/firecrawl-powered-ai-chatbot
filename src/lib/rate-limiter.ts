import redis from './redis';

const WINDOW_SIZE_IN_SECONDS = 60; // 1 minute
const MAX_REQUESTS = 5; // Max requests per user per minute

export const rateLimiter = {
  async limit(userId: string) {
    const key = `rate-limit:${userId}`;

    // Check the current count
    const currentCount = await redis.get(key);

    if (currentCount && parseInt(currentCount) >= MAX_REQUESTS) {
      return { success: false };
    }

    // Increment request count and set expiry
    await redis.multi().incr(key).expire(key, WINDOW_SIZE_IN_SECONDS).exec();

    return { success: true };
  },
};
