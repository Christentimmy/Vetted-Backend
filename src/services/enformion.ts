import axios, { AxiosError, AxiosInstance } from "axios";
import {
  CallerIdRequest,
  CallerIdResponse,
  CriminalSearchRequest,
  CriminalSearchResponse,
  EnformionConfig,
  EnformionError,
  EnformionResponse,
  IdVerificationRequest,
  IdVerificationResponse,
  PersonSearchRequest,
  PersonSearchResponse,
  ReversePhoneSearchRequest,
  ReversePhoneSearchResponse,
} from "../types/enformion_type";
import redisClient from "../config/redis";

// ==================== SERVICE CLASS ====================

class EnformionService {
  private axiosInstance: AxiosInstance;
  private apName: string;
  private apPassword: string;

  constructor(config: EnformionConfig) {
    this.apName = config.apName;
    this.apPassword = config.apPassword;

    this.axiosInstance = axios.create({
      baseURL: config.baseURL || "https://devapi.enformion.com",
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Build request headers for Enformion API
   */
  private buildHeaders(searchType: string): Record<string, string> {
    return {
      "galaxy-ap-name": this.apName,
      "galaxy-ap-password": this.apPassword,
      "galaxy-search-type": searchType,
      "Content-Type": "application/json",
    };
  }

  /**
   * Handle API errors and return standardized error object
   */
  private handleError(error: unknown): EnformionError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        success: false,
        error: axiosError.message,
        statusCode: axiosError.response?.status,
        details: axiosError.response?.data,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }

  /**
   * 1. REVERSE PHONE SEARCH
   * Returns all individuals associated with a provided phone number
   */
  async reversePhoneSearch(
    params: ReversePhoneSearchRequest
  ): Promise<EnformionResponse<ReversePhoneSearchResponse[]>> {
    try {
      const cacheKey = `ReversePhoneSearch:${params.Phone}`;

      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const cachedStr = cached.toString("utf8");
          return JSON.parse(cachedStr);
        }
      } catch (cacheReadErr) {
        console.warn("⚠️ Redis read failed:", cacheReadErr.message);
      }

      const res = await this.axiosInstance.post("/ReversePhoneSearch", params, {
        headers: this.buildHeaders("ReversePhone"),
      });
      const response = {
        success: true,
        data: res.data,
      };

      try {
        await redisClient.set(cacheKey, JSON.stringify(response), { EX: 240 });
      } catch (cacheWriteErr) {
        console.warn("⚠️ Redis write failed:", cacheWriteErr.message);
      }

      return response as EnformionResponse<ReversePhoneSearchResponse[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 2. CALLER ID / PHONE ENRICH
   * Returns detailed person information from phone number including name, age, addresses, phones, emails
   */
  async phoneEnrich(
    params: CallerIdRequest
  ): Promise<EnformionResponse<CallerIdResponse>> {
    try {
      const cacheKey = `Phone/Enrich:${params.Phone}`;

      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached.toString());
          return parsed;
        }
      } catch (cacheReadErr) {
        console.warn("⚠️ Redis read failed:", cacheReadErr.message);
      }

      const res = await this.axiosInstance.post("/Phone/Enrich", params, {
        headers: this.buildHeaders("DevAPICallerID"),
      });

      const response = {
        success: true,
        data: res.data,
      };

      try {
        await redisClient.set(cacheKey, JSON.stringify(response), { EX: 240 });
      } catch (cacheWriteErr) {
        console.warn("⚠️ Redis write failed:", cacheWriteErr.message);
      }

      return response as EnformionResponse<CallerIdResponse>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 3. PERSON SEARCH
   * Comprehensive person search with various search combinations
   * Can search by: SSN, Name+Address, Name+City+State, Name+DOB, Phone, Address
   */
  async personSearch(
    params: PersonSearchRequest
  ): Promise<EnformionResponse<PersonSearchResponse[]>> {
    try {
      const cacheKey = `PersonSearch:${params.FirstName}:${params.LastName}`;

      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached.toString());
          return parsed;
        }
      } catch (cacheReadErr) {
        console.warn("⚠️ Redis read failed:", cacheReadErr.message);
      }

      const response = await this.axiosInstance.post("/PersonSearch", params, {
        headers: this.buildHeaders("Person"),
      });

      const result = {
        success: true,
        data: response.data,
      };

      try {
        await redisClient.set(cacheKey, JSON.stringify(result), { EX: 240 });
      } catch (cacheWriteErr) {
        console.warn("⚠️ Redis write failed:", cacheWriteErr.message);
      }

      return result as EnformionResponse<PersonSearchResponse[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 4. ID VERIFICATION
   * Verifies identity and returns identity score with matched fields
   */
  async idVerification(
    params: IdVerificationRequest
  ): Promise<EnformionResponse<IdVerificationResponse>> {
    try {
      const response = await this.axiosInstance.post(
        "/Identity/Verify_Id",
        params,
        {
          headers: this.buildHeaders("DevAPIIdVerification"),
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 5. CRIMINAL SEARCH
   * Find criminal records based on name and location
   */
  async criminalSearch(
    params: CriminalSearchRequest
  ): Promise<EnformionResponse<CriminalSearchResponse>> {
    try {
      const cacheKey = `CriminalSearch:${params.FirstName}:${params.LastName}`;

      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached.toString());
          return parsed;
        }
      } catch (cacheReadErr) {
        console.warn("⚠️ Redis read failed:", cacheReadErr.message);
      }

      const response = await this.axiosInstance.post(
        "/CriminalSearch/V2",
        params,
        {
          headers: this.buildHeaders("CriminalV2"),
        }
      );

      const result = {
        success: true,
        data: response.data,
      };

      try {
        await redisClient.set(cacheKey, JSON.stringify(result), { EX: 240 });
      } catch (cacheWriteErr) {
        console.warn("⚠️ Redis write failed:", cacheWriteErr.message);
      }

      return result as EnformionResponse<CriminalSearchResponse>;
    } catch (error) {
      console.log("Error", error);
      return this.handleError(error);
    }
  }

  async marriageSearch(
    firstName: string,
    lastName: string,
    middleName: string,
    address: string
  ) {
    try {
      let city = "";
      let state = "";

      // Split by comma first (helps with multi-part addresses)
      const parts = address.split(",");

      if (parts.length >= 2) {
        // Example:
        // parts[0] = "3021 94th St East Elmhurst"
        // parts[1] = " NY 11369"
        const stateZip = parts[1].trim().split(" ");
        state = stateZip[0]?.trim() || "";
        city = parts[0].split(" ").slice(-1)[0]?.trim() || ""; // last word before comma as city guess
      } else {
        // fallback if no comma
        const match = address.match(/([A-Za-z\s]+),?\s*([A-Z]{2})\s*\d{5}/);
        if (match) {
          city = match[1].trim();
          state = match[2].trim();
        }
      }

      const cacheKey = `MarriageSearch:${firstName}:${lastName}`;

      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached.toString());
          return parsed;
        }
      } catch (cacheReadErr) {
        console.warn("⚠️ Redis read failed:", cacheReadErr.message);
      }

      const response = await this.axiosInstance.post(
        "/MarriageSearch",
        {
          FirstName: firstName,
          LastName: lastName,
          MiddleName: middleName,
          City: city,
          State: state,
        },
        {
          headers: this.buildHeaders("Marriage"),
        }
      );

      const result = {
        success: true,
        data: response.data,
      };

      try {
        await redisClient.set(cacheKey, JSON.stringify(result), { EX: 50 });
      } catch (cacheWriteErr) {
        console.warn("⚠️ Redis write failed:", cacheWriteErr.message);
      }

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default EnformionService;
