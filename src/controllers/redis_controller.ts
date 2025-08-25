import redisClient from "../config/redis";

export const redisController = {

  saveOtpToStore: async (phone: string, otp: string) => {
    try {
      let expirySeconds = Number(process.env.EXPIRYSECONDS) || 300;
      await redisClient.set(`otp:${phone}`, otp, { EX: expirySeconds });
      return true;
    } catch (error) {
      console.error("Error saving OTP:", error);
      return false;
    }
  },

  getOtpFromStore: async (phone: string) => {
    try {
      return await redisClient.get(`otp:${phone}`);
    } catch (error) {
      console.error("Error retrieving OTP:", error);
      return null;
    }
  },

  removeOtp: async (phone: string) => {
    try {
      await redisClient.del(`otp:${phone}`);
      return true;
    } catch (error) {
      console.error("Error removing OTP:", error);
      return false;
    }
  },
};
