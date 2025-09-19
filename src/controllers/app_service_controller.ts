import { Request, Response } from "express";
import { reverseImageSearch } from "../services/reverse_image_service";
import { getNumberDetails } from "../services/twilio_service";
import {
  searchByPhoneNumber,
  searchByName,
} from "../services/whitepages_service";
import {
  getSexOffendersNearby,
  getSexOffendersByName,
} from "../services/crimeometer_service";

export const appServiceController = {
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

  reverseImage: async (req: Request, res: Response) => {
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

      const result = await reverseImageSearch(imageUrl || req.file.path);
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
        radius ? Number(radius) : 1, // default radius = 1 mile
        page ? Number(page) : 1 // default page = 1
      );

      if (!offenders || offenders.length === 0) {
        return res.status(404).json({ message: "No offenders found nearby" });
      }

      res.json({ message: "Offenders found", data: offenders });
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
      if (!offenders || offenders.length === 0) {
        return res.status(404).json({ message: "No offenders found" });
      }
      res.json({ message: "Offender found", data: offenders });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch offender" });
    }
  },

  phoneLookup: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "Phone is required" });
      }
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ message: "Phone is required" });

      const result = await searchByPhoneNumber(phone);
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
      const { firstName, lastName, city, state } = req.body;
      if (!firstName || !lastName)
        return res
          .status(400)
          .json({ message: "First and last name required" });

      const result = await searchByName(firstName, lastName, city, state);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: "Lookup failed" });
    }
  },
};
