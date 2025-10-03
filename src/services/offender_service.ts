import axios from "axios";

const OFFENDERS_API = "https://api.offenders.io/v1/offenders";
const API_KEY = process.env.OFFENDERS_API_KEY as string;

export const fetchOffenders = async (lat: number, lon: number, radius: number = 10) => {
  const res = await axios.get(OFFENDERS_API, {
    headers: { Authorization: `Bearer ${API_KEY}` },
    params: { lat, lon, radius }
  });

  return res.data;
};
