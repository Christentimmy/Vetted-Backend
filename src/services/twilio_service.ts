import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export type BasicLookup = {
  phoneNumber: string | null;
  nationalFormat: string | null;
  countryCode: string | null;
  // CNAM (US only, may be null)
  callerName: string | null;
  callerType: string | null; // 'BUSINESS' | 'CONSUMER' | etc.
  // Line type / carrier
  lineType: string | null; // mobile | landline | voip | toll_free | ...
  carrierName: string | null;
  mcc: string | null;
  mnc: string | null;
  errorCode: string | null;
};

/**
 * Sends OTP to the provided phone number.
 * @param {string} userPhoneNumber - The phone number to send OTP to.
 * @returns {Promise<Object>} - A response object with status and message.
 */
export const sendOtpToUserPhoneNumber = async (userPhoneNumber: string) => {
  try {
    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);
    const message = `Your OTP code is ${otp}`;

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      throw new Error("TWILIO_PHONE_NUMBER environment variable is not set");
    }

    const sentMessage = await client.messages.create({
      body: message,
      to: userPhoneNumber,
      from: fromNumber,
    });

    return { success: true, otp }; // Return the OTP so that it can be stored in the user model
  } catch (error) {
    console.error("Error in sending OTP:", error);
    return { success: false, error: "Failed to send OTP." }; // Error response if something goes wrong
  }
};

export const checkNumberValidity = async (phoneNumber: string) => {
  try {
    const lookup = await client.lookups.v2.phoneNumbers(phoneNumber).fetch();
    return lookup["valid"];
  } catch (error) {
    console.error("Error fetching lookup:", error);
    return;
  }
};

export const getNumberDetails = async (phone: string) => {
  try {
    const result = await client.lookups.v2.phoneNumbers(phone).fetch({
      fields: "caller_name,line_type_intelligence",
    });

    if (!result) {
      return null;
    }

    return {
      phoneNumber: result.phoneNumber ?? null,
      nationalFormat: result.nationalFormat ?? null,
      countryCode: result.countryCode ?? null,

      callerName: result.callerName?.callerName ?? null,
      callerType: result.callerName?.callerType ?? null,

      lineType: result.lineTypeIntelligence?.type ?? null,
      carrierName: result.lineTypeIntelligence?.carrierName ?? null,
      mcc: result.lineTypeIntelligence?.mobileCountryCode ?? null,
      mnc: result.lineTypeIntelligence?.mobileNetworkCode ?? null,
      errorCode: result.lineTypeIntelligence?.errorCode ?? null,
    };
  } catch (error) {
    console.error("Error fetching Number Details:", error);
    return;
  }
};
