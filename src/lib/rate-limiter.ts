import redis from "./redis";

const WINDOW_SIZE_IN_SECONDS: number =
  Number(process.env.WINDOW_SIZE_IN_SECONDS) || 60; // 1 minute
const MAX_REQUESTS: number = Number(process.env.MAX_WINDOW_REQUEST_COUNT) || 5; 

export const rateLimiter = {
  async limit(userId: string): Promise<{ success: boolean }> {
    const key: string = `rate-limit:${userId}`;

    // Use Upstash pipeline (atomic operations)
    const [currentCount]: [number] = await redis
      .pipeline()
      .incr(key)
      .expire(key, WINDOW_SIZE_IN_SECONDS) // Set expiry time
      .exec<[number]>();

    return { success: currentCount <= MAX_REQUESTS };
  },
};
