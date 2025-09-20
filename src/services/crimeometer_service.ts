import axios from "axios";
import dotenv from "dotenv";

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

  try {
    const { data } = await axios.get(url, {
      headers: {
        "x-api-key": CRIMEOMETER_API_KEY.toString(),
        "Content-Type": "application/json",
      },
    });
    return data || [];
  } catch (error) {
    console.error(
      "Error fetching sex offender:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch sex offender data");
  }
};
