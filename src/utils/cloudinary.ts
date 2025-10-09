// src/utils/cloudinary.ts
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import streamifier from "streamifier";
import { config } from "./config";

/**
 * Configure Cloudinary with environment variables
 */
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary.
 * Supports:
 *  - Multer file buffers (req.file.buffer)
 *  - Base64 strings
 *  - Remote URLs
 *
 * @param file - Multer file or base64/URL string
 * @param folder - Optional folder name (default: "chipper")
 * @returns Promise<string> - The secure Cloudinary URL
 */
export const uploadImage = async (
  file: Express.Multer.File | string,
  folder = "chipper"
): Promise<string> => {
  try {
    // ✅ Case 1: Multer file buffer
    if (typeof file !== "string" && file.buffer) {
      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder, resource_type: "auto" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result as UploadApiResponse);
          }
        );
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
      });

      return result.secure_url;
    }

    // ✅ Case 2: Base64 string or remote URL
    if (typeof file === "string") {
      const result = await cloudinary.uploader.upload(file, {
        folder,
        resource_type: "auto",
      });
      return result.secure_url;
    }

    throw new Error("Invalid file type provided for Cloudinary upload.");
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err);
    throw new Error("Cloudinary upload failed: " + (err as Error).message);
  }
};
