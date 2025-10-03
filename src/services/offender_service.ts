import axios from "axios";

const OFFENDERS_API = "https://api.offenders.io/v1/offenders";
const API_KEY = process.env.OFFENDERS_API_KEY as string;
import redisClient from "../config/redis";
if(!API_KEY){
    throw new Error("OFFENDERS_API_KEY is not defined");
}

export const fetchOffenders = async (
  lat: number,
  lon: number,
  radius: number = 10
) => {
  const cacheKey = `offenders:${lat}:${lon}:${radius}`;

  // 1. Check cache first
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    console.log("Returning offenders from cache");
    return JSON.parse(cached.toString());
  }

  // 2. Otherwise, fetch from API
  const res = await axios.get(OFFENDERS_API, {
    headers: { Authorization: `Bearer ${API_KEY}` },
    params: { lat, lon, radius },
  });

  const data = res.data;

  // 3. Save to cache for 5 mins
  await redisClient.set(cacheKey, JSON.stringify(data), { EX: 300 });

  return data;
};
