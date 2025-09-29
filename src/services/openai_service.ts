import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not defined");
}

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Extract frames from video buffer
async function extractFramesFromVideo(
  videoBuffer: Buffer,
  frameCount: number = 4
): Promise<string[]> {
  const tempDir = path.join(__dirname, "temp");
  const videoId = uuidv4();
  const videoPath = path.join(tempDir, `video_${videoId}.mp4`);

  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // Write video buffer to temp file
    fs.writeFileSync(videoPath, videoBuffer);

    const framePromises: Promise<string>[] = [];

    // Extract frames at different timestamps
    for (let i = 0; i < frameCount; i++) {
      const timestamp = (i + 1) * (100 / (frameCount + 1)); // Distribute frames evenly
      framePromises.push(
        new Promise((resolve, reject) => {
          const framePath = path.join(tempDir, `frame_${videoId}_${i}.jpg`);

          ffmpeg(videoPath)
            .seekInput(`${timestamp}%`)
            .frames(1)
            .output(framePath)
            .on("end", () => {
              try {
                const frameBuffer = fs.readFileSync(framePath);
                const base64Frame = frameBuffer.toString("base64");
                fs.unlinkSync(framePath); // Clean up frame file
                resolve(base64Frame);
              } catch (err) {
                reject(err);
              }
            })
            .on("error", (err) => {
              reject(err);
            })
            .run();
        })
      );
    }

    const frames = await Promise.all(framePromises);

    // Clean up video file
    fs.unlinkSync(videoPath);

    return frames;
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
    throw error;
  }
}

export async function detectGenderWithChatGPT(
  base64Video: string
): Promise<string> {
  try {
    // Convert base64 to buffer and extract frames
    const videoBuffer = Buffer.from(base64Video, "base64");
    const frames = await extractFramesFromVideo(videoBuffer, 4);

    // Prepare content array with text prompt and all frames
    const content: any[] = [
      {
        type: "text",
        text: `
          You are analyzing multiple image frames extracted from a video for identity verification purposes.
          
          Analyze ALL the provided images and follow these steps:
          
          Step 1: Human Presence Detection
          - Examine all frames to confirm a real human person is visible
          
          Step 2: Gender Determination
          - Based on visible physical characteristics and presentation across all frames
          - Consider facial features, body shape, clothing, and overall appearance
          - Make your best assessment of gender presentation
          
          Response Format:
          - Answer with EXACTLY one word: "Male", "Female", or "Unknown"
          - No explanations, reasoning, or additional text
          - Be confident in your assessment when a clear determination can be made
          `.trim(),
      },
    ];

    // Add all frames to content
    frames.forEach((frame, index) => {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${frame}`,
          detail: "low",
        },
      });
    });

    const resp = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4o", // or gpt-4-vision-preview
        messages: [
          {
            role: "user",
            content: content,
          },
        ],
        max_tokens: 10,
        temperature: 0.1,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const answer = resp.data?.choices?.[0]?.message?.content?.trim();
    return answer || "Unknown";
  } catch (err: any) {
    console.error("OpenAI error:", err.response?.data || err.message);
    return "Unknown";
  }
}
