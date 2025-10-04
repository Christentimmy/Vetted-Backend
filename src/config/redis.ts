import { createClient } from "redis";
import config from "../config/config";

const redisClient = createClient({
  username: config.redis.username,
  password: config.redis.password,
  socket: {
    host: config.redis.url,
    port: Number(config.redis.port),
  },
});

async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      redisClient
        .connect()
        .catch((err) => console.warn("Redis reconnect failed:", err.message));
    }

    console.log("Redis client connected");
  } catch (err) {
    console.error("Redis connection error:", err);
  }
}

connectRedis();

redisClient.on("error", (err) => console.error("Redis Client Error", err));

export default redisClient;
