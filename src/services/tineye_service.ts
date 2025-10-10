import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.TINEYE_API_KEY;

if (!token) {
  throw new Error("TINEYE_API_KEY not found");
}

const baseUrl = "https://api.tineye.com/rest/search";

export const tinEyeService = {
  search: async (imageUrl: string) => {
    try {
      var params = {
        offset: 0,
        limit: 30,
        sort: "score",
        order: "desc",
      };
      const url =  `${baseUrl}/?image_url=${imageUrl}`;
      const response = await axios.get(url, {
        headers: {
          accept: "application/json",
          "x-api-key": token,
        },
        params: params,
      });
      return response.data;
    } catch (error) {
      console.error("Error searching image:", error);
      throw error;
    }
  },
};
