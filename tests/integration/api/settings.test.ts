import { NextRequest } from "next/server";
import { db } from "@/lib/db";

import { GET, PUT } from "@/app/api/settings/route";

afterAll(async () => {
  await db.appSettings.deleteMany({ where: { id: "singleton" } });
  await db.$disconnect();
});

describe("GET /api/settings", () => {
  it("returns 200 with the current settings object", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("smtpHost");
    expect(body).toHaveProperty("smtpPort");
    expect(body).toHaveProperty("smtpUser");
    expect(body).toHaveProperty("smtpPass");
    expect(body).toHaveProperty("smtpFrom");
  });
});

describe("PUT /api/settings", () => {
  it("persists a partial update", async () => {
    const req = new NextRequest("http://localhost/api/settings", {
      method: "PUT",
      body: JSON.stringify({ smtpHost: "smtp.test.com", smtpPort: 465 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.smtpHost).toBe("smtp.test.com");
    expect(body.smtpPort).toBe(465);
  });

  it("GET after PUT returns the updated values", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.smtpHost).toBe("smtp.test.com");
    expect(body.smtpPort).toBe(465);
  });

  it("ignores fields with wrong types and keeps the current value", async () => {
    const getRes = await GET();
    const before = await getRes.json();

    const req = new NextRequest("http://localhost/api/settings", {
      method: "PUT",
      body: JSON.stringify({ smtpPort: "not-a-number" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    const body = await res.json();
    expect(body.smtpPort).toBe(before.smtpPort);
  });
});
