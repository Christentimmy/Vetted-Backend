import { Request, Response } from "express";
import { googleReverseImageSearch } from "../services/google_image_service";
import { getNumberDetails } from "../services/twilio_service";
import {
  searchByPhoneNumber,
  searchByName,
} from "../services/whitepages_service";

import {
  getSexOffendersNearby,
  getSexOffendersByName,
} from "../services/crimeometer_service";
import { logSearch } from "../services/search_logger";
import { zenserpReverseImage } from "../services/zenserpReverseImage";
import { CallerIdResponse } from "../types/enformion_type";


import EnformionService from "../services/enformion";

if (!process.env.ENFORMION_AP_NAME || !process.env.ENFORMION_AP_PASSWORD) {
  throw new Error("ENFORMION_AP_NAME or ENFORMION_AP_PASSWORD not found");
}

// Initialize Enformion Service
const enformionService = new EnformionService({
  apName: process.env.ENFORMION_AP_NAME,
  apPassword: process.env.ENFORMION_AP_PASSWORD,
});

export const appServiceController = {
  enformionCallerId: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "number is required" });
        return;
      }

      const number = String(req.body.number);
      if (!number) {
        res.status(400).json({ message: "number is required" });
        return;
      }

      const phoneEnrich = await enformionService.phoneEnrich({
        Phone: number,
      });
      const reverseInfo = await enformionService.reversePhoneSearch({
        Phone: number,
      });
      let personFromEnrich: CallerIdResponse | undefined = phoneEnrich["data"];
      const mapped = mapReverseInfo(reverseInfo);

      const response = {
        fullName:
          personFromEnrich?.person?.name?.firstName +
          " " +
          personFromEnrich?.person?.name?.middleName +
          " " +
          personFromEnrich?.person?.name?.lastName,
        age: personFromEnrich?.person?.age,
        emails:
          (personFromEnrich?.person?.email
            ? [personFromEnrich?.person?.email]
            : personFromEnrich?.person?.emails) || [],
        isEmailValidated: personFromEnrich?.person?.isEmailValidated,
        isBusiness: personFromEnrich?.person?.isBusiness,
        address: personFromEnrich?.person?.addresses,
      };

      res.json({
        message: "Success",
        data: {
          data: response,
          reverseInfo: mapped,
        },
      });
    } catch (err: any) {
      if (err?.status === 404) {
        return res.status(404).json({ message: "Number not found" });
      }
      console.error(err);
      res.status(500).json({ message: "Lookup failed" });
    }
  },

  enformionReverseNumberSearch: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "number is required" });
        return;
      }

      const number = String(req.body.number);
      if (!number) {
        res.status(400).json({ message: "number is required" });
        return;
      }

      const info = await enformionService.reversePhoneSearch({
        Phone: number,
      });
      res.json({ message: "Success", data: info });
    } catch (err: any) {
      if (err?.status === 404) {
        return res.status(404).json({ message: "Number not found" });
      }
      console.error(err);
      res.status(500).json({ message: "Lookup failed" });
    }
  },

  enformionBackgroundSearch: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "Invalid Request" });
        return;
      }
      const {
        firstName,
        middleName,
        lastName,
        phoneNumber,
        street,
        city,
        state_code,
        zipcode,
      } = req.body;
      if (!firstName || !lastName) {
        res.status(400).json({ message: "Name is required" });
        return;
      }

      const info = await enformionService.personSearch({
        FirstName: firstName,
        MiddleName: middleName,
        LastName: lastName,
        Addresses: [
          {
            AddressLine1: street,
            AddressLine2: city,
            City: city,
            State: state_code,
            Zip: zipcode,
          },
        ],
        Phone: phoneNumber,
        Page: 1,
        ResultsPerPage: 2,
      });

      const response = info["data"]["persons"];
      if (!response || response.length === 0) {
        return res.status(404).json({ message: "No data found" });
      }

      const mapped = response.map((e) => {
        return {
          id: e["tahoeId"],
          name: e["fullName"],
          dateOfBirth: e["dobFirstSeen"],
          age: e["age"],
          address: e["addresses"].map((a: any) => a["fullAddress"]),
          phoneNumnber: e["phoneNumbers"].map((p: any) => p["phoneNumber"]),
          email: e["emailAddresses"].map((e: any) => e["emailAddress"]),
          relatives: e["relativesSummary"].map((r: any) => {
            return {
              name: r["firstName"] + " " + r["lastName"],
              relativeType: r["relativeType"],
            };
          }),
        };
      });

      res.status(200).json({ message: "Success", data: mapped });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lookup failed" });
    }
  },

  enformionCrimeRecord: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "Invalid Request" });
        return;
      }
      const { firstName, middleName, lastName } = req.body;
      if (!firstName || !lastName) {
        res.status(400).json({ message: "Name is required" });
        return;
      }

      const info = await enformionService.criminalSearch({
        FirstName: firstName,
        MiddleName: middleName,
        LastName: lastName,
        Page: 1,
        ResultsPerPage: 2,
      });
      if (!info.success) {
        return res.status(404).json({ message: "No data found" });
      }
      const criminalRecords = info["data"]["criminalRecords"];
      const response = criminalRecords.map((e)=>{
        return {
          name: e["names"][0]["firstName"]+" "+e["names"][0]["lastName"],
          offenderAttributes: e["offenderAttributes"],
          caseDetails: {
            caseNumber: e["caseDetails"][0]["caseNumber"],
            rawCategory: e["caseDetails"][0]["rawCategory"],
            courtCounty: e["caseDetails"][0]["courtCounty"],
            fees: e["caseDetails"][0]["fees"],
            fines: e["caseDetails"][0]["fines"],
            caseDate: e["caseDetails"][0]["caseDate"],
          },
          offense: e["offenses"][0]["offenseDescription"][0],
          image: e["images"][0]["imageUrl"],
        }
      });

      res.status(200).json({ message: "Success", data: response });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lookup failed" });
    }
  },

  getNumberInfo: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "number is required" });
        return;
      }

      const number = String(req.body.number);
      if (!number) {
        res.status(400).json({ message: "number is required" });
        return;
      }

      const info = await getNumberDetails(number);
      // If Twilio gives you basically nothing back, decide your policy:
      if (!info.lineType && !info.callerName && !info.carrierName) {
        return res.status(404).json({ message: "No data found", data: info });
      }

      res.json({ message: "Success", data: info });
    } catch (err: any) {
      if (err?.status === 404) {
        return res.status(404).json({ message: "Number not found" });
      }
      console.error(err);
      res.status(500).json({ message: "Lookup failed" });
    }
  },

  googleImageSearch: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "Image is required" });
        return;
      }

      const { imageUrl } = req.body;
      if (!imageUrl && !req.file) {
        res.status(400).json({ message: "Image is required" });
        return;
      }

      const result = await googleReverseImageSearch(imageUrl || req.file.path);

      await logSearch({
        userId: res.locals.userId,
        searchType: "image",
        query: { imageUrl },
        resultCount: result?.similarImages?.length || 0,
        req,
      });

      res.json({ message: "Success", data: result });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getSexOffendersByLocation: async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius, page = 1 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({ message: "lat and lng are required" });
      }

      const offenders = await getSexOffendersNearby(
        Number(lat),
        Number(lng),
        radius ? Number(radius) : 1,
        page ? Number(page) : 1
      );

      if (!offenders || offenders.length === 0) {
        return res.status(404).json({ message: "No offenders found nearby" });
      }

      const response = offenders["sex_offenders"];

      // Log the search
      await logSearch({
        userId: res.locals.user?._id,
        searchType: "sex_offender",
        query: { lat, lng, radius, page },
        resultCount: response?.length || 0,
        req,
      });

      res.json({ message: "Offenders found", data: response });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch offenders" });
    }
  },

  getSexOffenderByName: async (req: Request, res: Response) => {
    try {
      const { name } = req.query;
      if (!name) {
        return res.status(400).json({ message: "name is required" });
      }
      const offenders = await getSexOffendersByName(String(name));

      const response = offenders["sex_offenders"] ?? [];
      if (!response || response.length === 0) {
        return res.status(404).json({ message: "No offenders found" });
      }

      // Log the search
      await logSearch({
        userId: res.locals.user?._id,
        searchType: "sex_offender",
        query: { name },
        resultCount: response?.length || 0,
        req,
      });

      res.json({ message: "Offender found", data: response });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch offender" });
    }
  },

  phoneLookup: async (req: Request, res: Response) => {
    try {
      if (!req.query) {
        return res.status(400).json({ message: "Phone is required" });
      }
      const phone = req.query.phone.toString();
      if (!phone) return res.status(400).json({ message: "Phone is required" });

      const result = await searchByPhoneNumber(phone);

      await logSearch({
        userId: res.locals.user?._id,
        searchType: "phone",
        query: { phone },
        resultCount: result?.length || 0,
        req,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: "Lookup failed" });
    }
  },

  nameLookup: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "Phone is required" });
      }
      const { name, street, city, state_code, zipcode } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });

      const result = await searchByName(
        name,
        street,
        city,
        state_code,
        zipcode
      );

      // Log the search
      await logSearch({
        userId: res.locals.user?._id,
        searchType: "name",
        query: { name, street, city, state_code, zipcode },
        resultCount: result?.length || 0,
        req,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: "Lookup failed" });
    }
  },

  zenserpReverseImage: async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Image is required" });
      }
      const result = await zenserpReverseImage(req.file.path);
      res.json({ message: "Success", data: result });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};

interface SimplifiedReverseInfo {
  fullName: string;
  age?: number;
  phone: string;
  phones: {
    number: string;
    company: string;
    type: string;
    location?: string;
  }[];
  carrier?: string;
  coordinates?: { lat: number; lng: number };
  firstReported?: string;
  lastReported?: string;
}

function mapReverseInfo(reverseInfo: any): SimplifiedReverseInfo[] {
  if (!reverseInfo?.data?.reversePhoneRecords) return [];

  return reverseInfo.data.reversePhoneRecords.map((record: any) => {
    const tahoe = record.tahoePerson;
    const mainPhone = record.phoneNumber;
    const fullName =
      tahoe?.fullName || record?.names?.[0]?.firstName || "Unknown";

    const phones =
      tahoe?.phoneNumbers?.map((p: any) => ({
        number: p.phoneNumber,
        company: p.company,
        type: p.phoneType,
        location: p.location,
      })) || [];

    return {
      fullName,
      age: tahoe?.age,
      phone: mainPhone,
      phones,
      carrier: record.carrier,
      coordinates: record.latitude
        ? {
            lat: parseFloat(record.latitude),
            lng: parseFloat(record.longitude),
          }
        : undefined,
      firstReported: record.firstReportedDate,
      lastReported: record.lastReportedDate,
    };
  });
}
