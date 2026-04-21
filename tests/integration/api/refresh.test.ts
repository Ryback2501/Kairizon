const mockRunUpdate = jest.fn().mockResolvedValue(undefined);

jest.mock("@/lib/price-check-runner", () => ({
  runUpdate: mockRunUpdate,
  shouldSkip: jest.fn().mockReturnValue(false),
}));

jest.mock("@/lib/rate-limit", () => ({
  isRateLimited: jest.fn().mockReturnValue(false),
  allow: jest.fn(),
}));

import { POST } from "@/app/api/products/refresh/route";

beforeEach(() => mockRunUpdate.mockClear());

describe("POST /api/products/refresh", () => {
  it("returns 200 with { ok: true }", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("calls runUpdate exactly once", async () => {
    await POST();
    expect(mockRunUpdate).toHaveBeenCalledTimes(1);
  });
});
