import { Request, Response } from "express";
import UserModel from "../models/user_model";
import { reverseImageSearch } from "../services/reverse_image_service";

import { getNumberDetails } from "../services/twilio_service";

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

  reverseImage: async (req: Request, res: Response)=>{
    try {
      if(!req.body){
        res.status(400).json({message: "Image is required"});
        return;
      }

      const {imageUrl} = req.body;
      if(!imageUrl && !req.file){
        res.status(400).json({message: "Image is required"});
        return;
      }

      const result = await reverseImageSearch(imageUrl || req.file.path);
      res.json({ message: "Success", data: result });
    } catch (error) {
      console.log(error);
      res.status(500).json({message: "Internal server error"});
    }
  },
};
