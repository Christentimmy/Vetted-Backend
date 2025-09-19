import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const WHITEPAGES_API_KEY = process.env.WHITEPAGES_API_KEY;
if (!WHITEPAGES_API_KEY) {
  throw new Error("WhiteService Api Key Required");
}
// const BASE_URL = "https://proapi.whitepages.com/3.3"; // v3.3 API
const BASE_URL = "https://api.whitepages.com/v1";

/**
 * Search by phone number
 * @param phoneNumber e.g. "+14155552671"
 */
export const searchByPhoneNumber = async (phoneNumber: string) => {
  try {
    const url = `${BASE_URL}/person/?phone=${encodeURIComponent(phoneNumber)}`;
    const { data } = await axios.get(url, {
      headers: {
        "X-Api-Key": WHITEPAGES_API_KEY.toString(),
        "Content-Type": "application/json",
      },
    });
    return data;
  } catch (error: any) {
    console.error(
      "Whitepages phone search error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to search by phone number");
  }
};


export const searchByName = async (
  name: string,
  street?: string,
  city?: string,
  state_code?: string,
  zipcode?: string
) => {
  try {
    const params = new URLSearchParams({
      name,
    });
    if (street) params.append("street", street);
    if (city) params.append("city", city);
    if (state_code) params.append("state_code", state_code);
    if (zipcode) params.append("zipcode", zipcode);

    const url = `${BASE_URL}/person/?${params.toString()}`;

    const { data } = await axios.get(url, {
      headers: {
        "X-Api-Key": WHITEPAGES_API_KEY || "",
      },
    });

    return data;
  } catch (error: any) {
    console.error(
      "Whitepages name search error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to search by name");
  }
};
