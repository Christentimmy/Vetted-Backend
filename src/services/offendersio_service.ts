import axios from "axios";
import dotenv from "dotenv";
import redisClient from "../config/redis";

dotenv.config();

const OFFENDERIO_API_KEY = process.env.OFFENDERIO_API_KEY!;
const BASE_URL = `https://api.offenders.io/sexoffender`;

export const searchSexOffenderOnMap = async (
  firstName: string,
  lastName: string
) => {
  const url = `${BASE_URL}?firstName=${firstName}&lastName=${lastName}&key=${OFFENDERIO_API_KEY}`;
  const cacheKey = `offender:${firstName}:${lastName}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const cachedStr = cached.toString("utf8");
      return JSON.parse(cachedStr);
    }
  } catch (cacheReadErr) {
    console.warn("⚠️ Redis read failed:", cacheReadErr.message);
  }

  let data: any;
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    data = response.data;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch sex offender data");
  }

  try {
    await redisClient.set(cacheKey, JSON.stringify(data), { EX: 50 });
  } catch (cacheWriteErr) {
    console.warn("⚠️ Redis write failed:", cacheWriteErr.message);
  }

  return data || [];
};
