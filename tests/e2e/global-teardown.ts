import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export default async function globalTeardown() {
  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "" });
  const prisma = new PrismaClient({ adapter });
  try {
    await prisma.product.deleteMany({ where: { asin: "B00E2ETEST1" } });
    await prisma.appSettings.deleteMany({ where: { id: "singleton" } });
  } finally {
    await prisma.$disconnect();
  }
}
