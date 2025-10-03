import { Request, Response } from "express";
import { check } from "express-validator";
import { Server } from "socket.io";
import { validate } from "../middleware/validateMiddleware";
import { uploadImage } from "../utils/cloudinary";
import logger from "../utils/logger";
import prisma from "../utils/prisma";

// ✅ Validation for creating product
export const validateCreateProduct = [
  check("name").isLength({ min: 3 }).trim().withMessage("Name must be at least 3 characters"),
  check("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  check("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  check("categoryId").isInt({ min: 1 }).withMessage("Valid categoryId required"),
  check("description").isLength({ min: 10 }).trim().withMessage("Description must be at least 10 characters"),
  check("image").notEmpty().withMessage("Image is required"), // required on create
  validate,
];

// ✅ Validation for updating product
export const validateUpdateProduct = [
  check("name").optional().isLength({ min: 3 }).trim().withMessage("Name must be at least 3 characters"),
  check("price").optional().isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  check("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  check("categoryId").optional().isInt({ min: 1 }).withMessage("Valid categoryId required"),
  check("description").optional().isLength({ min: 10 }).trim().withMessage("Description must be at least 10 characters"),
  // ⛔ no image requirement here
  validate,
];

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({ include: { category: true } });
    logger.info("Fetched products", { count: products.length });
    res.json(products);
  } catch (error: unknown) {
    logger.error("Error fetching products", { error });
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

export const createProduct = async (req: Request, res: Response, socket: Server) => {
  try {
    const { name, price, stock, categoryId, description, image } = req.body;

    // ✅ Upload image to Cloudinary
    const imageUrl = await uploadImage(image);

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
    socket.emit("new-product", product);

    res.status(201).json(product);
  } catch (error: unknown) {
    logger.error("Error creating product", { error });
    res.status(400).json({ error: "Failed to create product" });
  }
};

export const updateProduct = async (req: Request, res: Response, socket: Server) => {
  try {
    const id = Number(req.params.id);
    const { name, price, stock, categoryId, description, image } = req.body;

    const updateData: any = {
      ...(name && { name }),
      ...(price && { price: parseFloat(price) }),
      ...(stock && { stock: Number(stock) }),
      ...(categoryId && { categoryId: Number(categoryId) }),
      ...(description && { description }),
    };

    if (image) {
      // ✅ Only upload if a new image is provided
      updateData.imageUrl = await uploadImage(image);
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    logger.info("Product updated", { productId: product.id });
    socket.emit("update-product", product);

    res.json(product);
  } catch (error: unknown) {
    logger.error("Error updating product", { error });
    res.status(400).json({ error: "Failed to update product" });
  }
};

export const deleteProduct = async (req: Request, res: Response, socket: Server) => {
  try {
    const id = Number(req.params.id);
    await prisma.product.delete({ where: { id } });

    logger.info("Product deleted", { productId: id });
    socket.emit("delete-product", { id });

    res.status(204).send();
  } catch (error: unknown) {
    logger.error("Error deleting product", { error });
    res.status(400).json({ error: "Failed to delete product" });
  }
};
