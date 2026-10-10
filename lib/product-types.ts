export type Product = {
   id: string;
   slug: string;
   name: string;
   category: string;
   description: string;
   price: number;
   image: string;
   featured: boolean;
   stock: number;
   createdAt?: Date | string;
   updatedAt?: Date | string;
};