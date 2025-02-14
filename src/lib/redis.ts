import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
//   tls: process.env.REDIS_TLS === 'true' ? {} : undefined, // Enable TLS if required
});

export default redis;
