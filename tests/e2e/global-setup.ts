import { PrismaClient } from "@prisma/client";

const TEST_ASIN = "B00E2ETEST1";

export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    // Configure SMTP so the settings modal does not block the UI
    await prisma.appSettings.upsert({
      where: { id: "singleton" },
      update: {
        smtpHost: "smtp.e2e-test.com",
        smtpPort: 587,
        smtpUser: "e2e@test.com",
        smtpPass: "e2e-pass",
        smtpFrom: "E2E <e2e@test.com>",
      },
      create: {
        id: "singleton",
        smtpHost: "smtp.e2e-test.com",
        smtpPort: 587,
        smtpUser: "e2e@test.com",
        smtpPass: "e2e-pass",
        smtpFrom: "E2E <e2e@test.com>",
      },
    });

    // Seed a product for tests that need an existing card
    await prisma.product.deleteMany({ where: { asin: TEST_ASIN } });
    await prisma.product.create({
      data: {
        asin: TEST_ASIN,
        title: "E2E Test Product",
        image: null,
        url: `https://www.amazon.com/dp/${TEST_ASIN}`,
        currentPrice: 49.99,
        inStock: true,
        availableSellers: JSON.stringify([
          { name: "Amazon", price: 49.99, shipping: 0, isSecondHand: false },
          { name: "UsedSeller", price: 30.0, shipping: 0, isSecondHand: true },
        ]),
        excludedSellers: JSON.stringify([]),
        includeSecondHand: true,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
