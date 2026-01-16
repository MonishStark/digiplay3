const { createLogger } = require("./../init/logger");
const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});

(async () => {
  const logger = await createLogger();

  redis.on("connect", () => {
    logger.info("[REDIS] Connected");
  });

  redis.on("error", (err) => {
    logger.error("[REDIS] Error", err);
  });
})();

module.exports = redis;