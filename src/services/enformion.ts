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
      const cached = await redisClient.get(cacheKey);
      // if (cached) {
      //   const cachedStr = cached.toString("utf8");
      //   return JSON.parse(cachedStr);
      // }

      const res = await this.axiosInstance.post("/ReversePhoneSearch", params, {
        headers: this.buildHeaders("ReversePhone"),
      });
      const response = {
        success: true,
        data: res.data,
      };

      await redisClient.set(cacheKey, JSON.stringify(response), { EX: 240 });

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
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const cachedStr = cached.toString("utf8");
        const parsed = JSON.parse(cachedStr);
        return parsed;
      }

      const res = await this.axiosInstance.post("/Phone/Enrich", params, {
        headers: this.buildHeaders("DevAPICallerID"),
      });

      const response = {
        success: true,
        data: res.data,
      };

      await redisClient.set(cacheKey, JSON.stringify(response), { EX: 240 });

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
      const response = await this.axiosInstance.post("/PersonSearch", params, {
        headers: this.buildHeaders("Person"),
      });

      return {
        success: true,
        data: response.data,
      };
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
      const response = await this.axiosInstance.post(
        "/CriminalSearch/V2",
        params,
        {
          headers: this.buildHeaders("DevAPICriminalSearch"),
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
}

export default EnformionService;
