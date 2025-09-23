import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Fix the errors by asserting that the environment variables are not undefined.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const uploadImage = async (image: string): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(image, {
      folder: 'chipper',
      transformation: [{ width: 600, height: 400, crop: 'fill', quality: 80 }],
    });
    return result.secure_url;
  } catch (error: unknown) {
    console.error('Error uploading to Cloudinary:', error instanceof Error ? error.message : String(error));
    throw new Error('Failed to upload image');
  }
};

export default cloudinary;