import vision from "@google-cloud/vision";

// The SDK automatically reads GOOGLE_APPLICATION_CREDENTIALS from env
const client = new vision.ImageAnnotatorClient();

export async function reverseImageSearch(imageUrl: string) {
  try {
    const [result] = await client.webDetection(imageUrl);

    const webDetection = result.webDetection;

    const similarImages = webDetection?.visuallySimilarImages?.map(img => img.url) || [];
    const pages = webDetection?.pagesWithMatchingImages?.map(p => p.url) || [];

    return { similarImages, pages };
  } catch (error) {
    console.error("Reverse Image Search Error:", error);
    throw new Error("Reverse image search failed");
  }
}
