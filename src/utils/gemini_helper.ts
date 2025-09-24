import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export async function detectGenderWithGemini(
  base64Video: string
): Promise<string> {
  try {
    const resp = await axios.post(
      GEMINI_API_URL,
      {
        contents: [
          {
            parts: [
              {
                text: `
                You are analyzing a short video clip for identity verification.
                
                Your job has three steps:
                
                Step 1: Human Detection  
                - Check if there is a real, visible human being in the video.  
                - If no human is visible, or if the video looks fake (e.g., cartoon, sketch, object, or static image), respond with "Unknown".  
                
                Step 2: Liveness Verification  
                - Determine if the human appears to be a live person recorded directly, not a replay from a laptop, phone, or other screen.  
                - Indicators of liveness: natural movement, changes in lighting/shadows, blinking, head turns.  
                - If the video looks like a recording of another screen, poster, or static image, respond with "Unknown".  
                
                Step 3: Gender Classification  
                - If the subject is a live human, determine the person’s gender presentation.  
                - Respond with exactly one word: "Male" or "Female".  
                
                Final Output Rules:  
                - Respond with ONLY one of these: "Male", "Female", or "Unknown".  
                - Do not include explanations or reasoning.  
                `.trim(),                
              },
              {
                inline_data: {
                  mime_type: "video/mp4",
                  data: base64Video,
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY!,
        },
      }
    );

    const answer =
      resp.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return answer || "Unknown";
  } catch (err: any) {
    console.error("Gemini error:", err.response?.data || err.message);
    return "Unknown";
  }
}
