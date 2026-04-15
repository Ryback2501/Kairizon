import { PrismaClient } from "@prisma/client";

export default async function globalTeardown() {
  const prisma = new PrismaClient();
  try {
    await prisma.product.deleteMany({ where: { asin: "B00E2ETEST1" } });
    await prisma.appSettings.deleteMany({ where: { id: "singleton" } });
  } finally {
    await prisma.$disconnect();
  }
}
