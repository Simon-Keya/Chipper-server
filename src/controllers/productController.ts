import { Request, Response } from "express";
import { check } from "express-validator";
import multer from "multer";
import path from "path";
import { Server } from "socket.io";
import { validate } from "../middleware/validateMiddleware";
import { uploadImage } from "../utils/cloudinary";
import logger from "../utils/logger";
import prisma from "../utils/prisma";

// ==========================
// 🔧 Multer configuration
// ==========================
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// ==========================
// 🧩 Validation middleware
// ==========================
export const validateCreateProduct = [
  check("name").isLength({ min: 3 }).trim().withMessage("Name must be at least 3 characters"),
  check("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  check("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  check("categoryId").isInt({ min: 1 }).withMessage("Valid categoryId required"),
  check("description").isLength({ min: 10 }).trim().withMessage("Description must be at least 10 characters"),
  validate,
];

export const validateUpdateProduct = [
  check("name").optional().isLength({ min: 3 }).trim(),
  check("price").optional().isFloat({ min: 0 }),
  check("stock").optional().isInt({ min: 0 }),
  check("categoryId").optional().isInt({ min: 1 }),
  check("description").optional().isLength({ min: 10 }).trim(),
  validate,
];

// ==========================
// 📦 Controllers
// ==========================

// Get all products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({ include: { category: true } });
    logger.info("Fetched products", { count: products.length });
    res.json(products);
  } catch (error) {
    logger.error("Error fetching products", { error });
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

// Get single product
export const getProductById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    logger.info("Fetched single product", { productId: id });
    res.json(product);
  } catch (error) {
    logger.error("Error fetching single product", { error });
    res.status(500).json({ error: "Failed to fetch product" });
  }
};

// Create product (admin)
export const createProduct = async (req: Request, res: Response, io: Server) => {
  try {
    const { name, price, stock, categoryId, description } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: "Image file is required" });
    }

    // Upload to Cloudinary
    const imageUrl = await uploadImage(imageFile);

    const product = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        stock: Number(stock),
        categoryId: Number(categoryId),
        description,
        imageUrl,
      },
      include: { category: true },
    });

    logger.info("Product created", { productId: product.id });
    io.emit("new-product", product);
    res.status(201).json(product);
  } catch (error) {
    logger.error("Error creating product", { error });
    res.status(400).json({ error: "Failed to create product" });
  }
};

// Update product (admin)
export const updateProduct = async (req: Request, res: Response, io: Server) => {
  try {
    const id = Number(req.params.id);
    const { name, price, stock, categoryId, description } = req.body;
    const imageFile = req.file;

    const updateData: any = {
      ...(name && { name }),
      ...(price && { price: parseFloat(price) }),
      ...(stock && { stock: Number(stock) }),
      ...(categoryId && { categoryId: Number(categoryId) }),
      ...(description && { description }),
    };

    if (imageFile) {
      updateData.imageUrl = await uploadImage(imageFile);
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    logger.info("Product updated", { productId: product.id });
    io.emit("update-product", product);
    res.json(product);
  } catch (error) {
    logger.error("Error updating product", { error });
    res.status(400).json({ error: "Failed to update product" });
  }
};

// Delete product
export const deleteProduct = async (req: Request, res: Response, io: Server) => {
  try {
    const id = Number(req.params.id);
    await prisma.product.delete({ where: { id } });
    logger.info("Product deleted", { productId: id });
    io.emit("delete-product", { id });
    res.status(204).send();
  } catch (error) {
    logger.error("Error deleting product", { error });
    res.status(400).json({ error: "Failed to delete product" });
  }
};
