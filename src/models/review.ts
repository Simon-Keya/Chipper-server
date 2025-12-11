export interface Review {
    id: number;
    productId: number;
    userId: number;
    rating: number;
    comment?: string;
    createdAt: string;
    user: {
      id: number;
      name: string;
    };
  }
  
  export interface ReviewPayload {
    rating: number;
    comment?: string;
  }