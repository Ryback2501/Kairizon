// price-check-runner holds module-level state (lastFullUpdate). Each describe block
// uses jest.resetModules() + dynamic import to get a fresh module instance.

const mockRunPriceCheck = jest.fn().mockResolvedValue(undefined);

jest.mock("@/repositories/ProductRepository");
jest.mock("@/repositories/AppSettingsRepository");
jest.mock("@/services/scraping/AmazonScraper");
jest.mock("@/services/notification/EmailNotificationService");
jest.mock("@/services/price-check/PriceCheckService", () => ({
  PriceCheckService: jest.fn().mockImplementation(() => ({
    runPriceCheck: mockRunPriceCheck,
  })),
}));

describe("shouldSkip", () => {
  beforeEach(() => {
    jest.resetModules();
    mockRunPriceCheck.mockClear();
  });

  it("returns false when runUpdate has never been called", async () => {
    const { shouldSkip } = await import("@/lib/price-check-runner");
    expect(shouldSkip()).toBe(false);
  });

  it("returns true immediately after runUpdate is called", async () => {
    const { shouldSkip, runUpdate } = await import("@/lib/price-check-runner");
    await runUpdate();
    expect(shouldSkip()).toBe(true);
  });

  it("returns false after 5 minutes have elapsed since last update", async () => {
    jest.useFakeTimers();
    try {
      const { shouldSkip, runUpdate } = await import("@/lib/price-check-runner");
      await runUpdate();
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      expect(shouldSkip()).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it("returns true before 5 minutes have elapsed", async () => {
    jest.useFakeTimers();
    try {
      const { shouldSkip, runUpdate } = await import("@/lib/price-check-runner");
      await runUpdate();
      jest.advanceTimersByTime(5 * 60 * 1000 - 1);
      expect(shouldSkip()).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("runUpdate", () => {
  beforeEach(() => {
    jest.resetModules();
    mockRunPriceCheck.mockClear();
  });

  it("calls service.runPriceCheck", async () => {
    const { runUpdate } = await import("@/lib/price-check-runner");
    await runUpdate();
    expect(mockRunPriceCheck).toHaveBeenCalledTimes(1);
  });

  it("sets lastFullUpdate so shouldSkip returns true afterwards", async () => {
    const { runUpdate, shouldSkip } = await import("@/lib/price-check-runner");
    expect(shouldSkip()).toBe(false);
    await runUpdate();
    expect(shouldSkip()).toBe(true);
  });
});
