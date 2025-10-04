import axios from "axios";
import dotenv from "dotenv";
import redisClient from "../config/redis";

dotenv.config();

const CRIMEOMETER_API_KEY = process.env.CRIMEOMETER_API_KEY!;
const BASE_URL = "https://api.crimeometer.com/v3";

export const getSexOffendersNearby = async (
  lat: number,
  lng: number,
  radius: number,
  page: number
) => {
  const url = `${BASE_URL}/sex-offenders/location`;
  const cacheKey = `offenders:${lat}:${lng}:${radius}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const cachedStr = cached.toString("utf8");
      return JSON.parse(cachedStr);
    }
  } catch (cacheReadErr) {
    console.warn("⚠️ Redis read failed:", cacheReadErr.message);
  }

  try {
    const { data } = await axios.get(url, {
      headers: {
        "x-api-key": CRIMEOMETER_API_KEY.toString(),
        "Content-Type": "application/json",
      },
      params: {
        lat,
        lon: lng,
        distance: `${radius}mi`,
        page,
      },
    });

    try {
      await redisClient.set(cacheKey, JSON.stringify(data), { EX: 240 });
    } catch (cacheWriteErr) {
      console.warn("⚠️ Redis write failed:", cacheWriteErr.message);
    }

    return data || [];
  } catch (error) {
    console.error(
      "Error fetching sex offenders:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch sex offender data");
  }
};

export const getSexOffendersByName = async (name: string) => {
  const url = `${BASE_URL}/sex-offenders/records?name=${name}`;
  const cacheKey = `offender:${name}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const cachedStr = cached.toString("utf8");
      return JSON.parse(cachedStr);
    }
  } catch (cacheReadErr) {
    console.warn("⚠️ Redis read failed:", cacheReadErr.message);
  }

  try {
    const { data } = await axios.get(url, {
      headers: {
        "x-api-key": CRIMEOMETER_API_KEY.toString(),
        "Content-Type": "application/json",
      },
    });

    try {
      await redisClient.set(cacheKey, JSON.stringify(data), { EX: 240 });
    } catch (cacheWriteErr) {
      console.warn("⚠️ Redis write failed:", cacheWriteErr.message);
    }

    return data || [];
  } catch (error) {
    console.error(
      "Error fetching sex offender:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch sex offender data");
  }
};
