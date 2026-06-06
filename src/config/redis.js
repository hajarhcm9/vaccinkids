const { createClient } = require('redis');
const config = require('./index');

let client = null;
let connectionPromise = null;

function logRedisError(error) {
  if (process.env.NODE_ENV === 'test') return;
  console.error(
    JSON.stringify({
      level: 'error',
      event: 'redis_error',
      message: error.message,
    }),
  );
}

function getRedisClient() {
  if (!config.rateLimit.redisUrl) return null;
  if (client) return client;

  client = createClient({
    url: config.rateLimit.redisUrl,
    socket: {
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS, 10) || 3000,
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });
  client.on('error', logRedisError);
  return client;
}

async function connectRedis() {
  const redisClient = getRedisClient();
  if (!redisClient) {
    if (config.rateLimit.requireSharedStore) {
      throw new Error('RATE_LIMIT_REDIS_URL or REDIS_URL is required for the shared rate limiter');
    }
    return null;
  }

  if (!connectionPromise) {
    connectionPromise = redisClient.connect().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }
  await connectionPromise;
  return redisClient;
}

async function closeRedis() {
  if (!client?.isOpen) return;
  await client.quit();
  client = null;
  connectionPromise = null;
}

module.exports = { getRedisClient, connectRedis, closeRedis };
