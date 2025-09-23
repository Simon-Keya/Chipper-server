import { Product } from './product';

export interface Order {
  id: number;
  productId: number;
  product: Product;
  quantity: number;
  total: number;
  createdAt: string;
}