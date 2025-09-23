export interface User {
    id: number;
    username: string;
    password: string;
    role: 'admin' | 'user';
    createdAt: string;
    updatedAt: string;
  }