// src/routes/productRoutes.ts
import express, { Request, Response } from "express";
import multer from "multer";
import { Server } from "socket.io";
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
  validateCreateProduct,
  validateUpdateProduct,
} from "../controllers/productController";

const router = express.Router();

// ✅ Configure Multer for file uploads (memory storage for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Initializes product routes with a Socket.IO instance.
 * @param io Socket.IO server instance
 */
export const initializeProductRoutes = (io: Server) => {
  // ✅ Public routes
  router.get("/", (req: Request, res: Response) => getProducts(req, res));
  router.get("/:id", (req: Request, res: Response) => getProductById(req, res));

  // ✅ Admin routes (protected)
  router.post(
    "/",
    upload.single("image"), // Handle single image file upload
    validateCreateProduct,
    (req: Request, res: Response) => createProduct(req, res, io)
  );

  router.put(
    "/:id",
    upload.single("image"),
    validateUpdateProduct,
    (req: Request, res: Response) => updateProduct(req, res, io)
  );

  router.delete("/:id", (req: Request, res: Response) => deleteProduct(req, res, io));

  return router;
};

export default initializeProductRoutes;
