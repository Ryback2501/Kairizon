import { db } from "@/lib/db";
import api from "@/api/index";

afterAll(() => {
  db.prepare(`DELETE FROM "AppSettings" WHERE "id" = 'singleton'`).run();
});

describe("GET /api/settings", () => {
  it("returns 200 with the current settings object", async () => {
    const res = await api.request("/settings");
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
  function put(body: unknown) {
    return api.request("/settings", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  it("persists a partial update", async () => {
    const res = await put({ smtpHost: "smtp.test.com", smtpPort: 465 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.smtpHost).toBe("smtp.test.com");
    expect(body.smtpPort).toBe(465);
  });

  it("GET after PUT returns the updated values", async () => {
    const res = await api.request("/settings");
    const body = await res.json();
    expect(body.smtpHost).toBe("smtp.test.com");
    expect(body.smtpPort).toBe(465);
  });

  it("ignores fields with wrong types and keeps the current value", async () => {
    const getRes = await api.request("/settings");
    const before = await getRes.json();
    const res = await put({ smtpPort: "not-a-number" });
    const body = await res.json();
    expect(body.smtpPort).toBe(before.smtpPort);
  });
});
