// src/utils/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import { config } from "./config";

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

export const uploadImage = async (image: string): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(image, {
      folder: "chipper", // optional folder in your cloudinary account
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (err) {
    throw new Error("Cloudinary upload failed: " + (err as Error).message);
  }
};
