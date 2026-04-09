import type { DefaultSession } from "next-auth";
import type { Product, User } from "@prisma/client";

// Extend NextAuth session to include user.id
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export type ProductWithUser = Product & { user: Pick<User, "email" | "name"> };

export type ScrapeResult = {
  title: string;
  image: string | null;
  currentPrice: number | null;
  asin: string;
  inStock: boolean;
};
