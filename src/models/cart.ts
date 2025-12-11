export interface CartItem {
    id: number;
    userId?: number;
    productId: number;
    quantity: number;
    product: {
      id: number;
      name: string;
      price: number;
      imageUrl: string;
    };
  }
  
  export interface CartResponse {
    items: CartItem[];
    total: number;
  }