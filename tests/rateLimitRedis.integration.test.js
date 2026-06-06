const express = require('express');
const request = require('supertest');

const describeWithRedis =
  process.env.REDIS_URL && process.env.RATE_LIMIT_TEST_REDIS === 'true' ? describe : describe.skip;

describeWithRedis('Shared Redis rate limiting', () => {
  let closeRedis;
  let redis;

  beforeAll(async () => {
    const redisConfig = require('../src/config/redis');
    closeRedis = redisConfig.closeRedis;
    redis = await redisConfig.connectRedis();
    await redis.flushDb();
  });

  afterAll(async () => {
    if (redis) await redis.flushDb();
    if (closeRedis) await closeRedis();
  });

  test('two API instances share the same limiter counter', async () => {
    const { createLimiter } = require('../src/middleware/rateLimiter');
    const makeApp = () => {
      const app = express();
      app.use(createLimiter('otp', { max: 1, validate: false }));
      app.get('/', (_req, res) => res.json({ ok: true }));
      return app;
    };

    expect((await request(makeApp()).get('/')).status).toBe(200);
    expect((await request(makeApp()).get('/')).status).toBe(429);
  });
});
