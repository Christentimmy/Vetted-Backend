import vision from "@google-cloud/vision";
import dotenv from "dotenv";

dotenv.config();

const credentials = {
  "type": "service_account",
  "project_id": process.env.GOOGLE_PROJECT_ID,
  "private_key_id": process.env.GOOGLE_PRIVATE_KEY_ID,
  "private_key": process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  "client_email": process.env.GOOGLE_CLIENT_EMAIL,
  "client_id": process.env.GOOGLE_CLIENT_VISION_ID,
  "auth_uri": process.env.GOOGLE_AUTH_URI,
  "token_uri": process.env.GOOGLE_TOKEN_URI,
  "auth_provider_x509_cert_url": process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
  "client_x509_cert_url": process.env.GOOGLE_CLIENT_X509_CERT_URL,
  "universe_domain": process.env.GOOGLE_UNIVERSE_DOMAIN,
};

if (!credentials.private_key || !credentials.client_email) {
  throw new Error(
    "Google credentials are incomplete. Check your environment variables"
  );
}

const client = new vision.ImageAnnotatorClient({
  credentials,
});

export async function googleReverseImageSearch(imageUrl: string) {
  try {
    const limit = 20;
    const [result] = await client.webDetection({
      image: { source: { imageUri: imageUrl } },
    });

    const webDetection = result.webDetection;

    const similarImages =
      webDetection?.visuallySimilarImages
        ?.slice(0, limit)
        .map((img) => img.url) || [];

    const pages =
      webDetection?.pagesWithMatchingImages
        ?.slice(0, limit)
        .map((p) => p.url) || [];

    return { similarImages, pages };
  } catch (error) {
    console.error("Reverse Image Search Error:", error);
    throw new Error("Reverse image search failed");
  }
}
