import { Category } from './category';

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  categoryId: number;
  category: Category;
  description: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}