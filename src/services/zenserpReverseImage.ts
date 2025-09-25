
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.ZENSERP_API_KEY;

export async function zenserpReverseImage(imageUrl: string) {
  if (!imageUrl || !apiKey) {
    throw new Error('Image URL and API key are required.');
  }

  const endpoint = 'https://app.zenserp.com/api/v2/search';

  const params = {
    apikey: apiKey,
    image_url: imageUrl,
    tbm: 'isch',   // Google Images vertical
    num: 20        // number of results
  };

  try {
    const response = await axios.get(endpoint, { params });

    if (response.data.errors) {
      throw new Error(`Zenserp API Error: ${JSON.stringify(response.data.errors)}`);
    }

    // Extract similar image results (if present)
    const images =
      response.data.image_results?.map((img: any) => ({
        title: img.title || null,
        source: img.source || null,
        link: img.link || null,
        imageUrl: img.thumbnail || img.original || null,
      })) || [];

    return { images, raw: response.data };
  } catch (error: any) {
    if (error.response) {
      console.error(
        'Zenserp API responded with error:',
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      console.error('No response received from Zenserp API:', error.request);
    } else {
      console.error('Error setting up the request:', error.message);
    }
    throw error;
  }
}
