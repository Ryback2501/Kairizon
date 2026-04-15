const mockRunUpdate = jest.fn().mockResolvedValue(undefined);
const mockShouldSkip = jest.fn();

jest.mock("@/lib/price-check-runner", () => ({
  runUpdate: mockRunUpdate,
  shouldSkip: mockShouldSkip,
}));

import { startPriceCheckCron } from "@/lib/cron";
import type cron from "node-cron";

function makeMockCron() {
  return { schedule: jest.fn() } as unknown as typeof cron;
}

beforeEach(() => {
  mockRunUpdate.mockClear();
  mockShouldSkip.mockReset();
});

describe("startPriceCheckCron", () => {
  it("calls runUpdate immediately on startup", () => {
    const mockCron = makeMockCron();
    startPriceCheckCron(mockCron);
    expect(mockRunUpdate).toHaveBeenCalledTimes(1);
  });

  it("schedules a job with the cron pattern '0,30 * * * *'", () => {
    const mockCron = makeMockCron();
    startPriceCheckCron(mockCron);
    expect(mockCron.schedule).toHaveBeenCalledWith(
      "0,30 * * * *",
      expect.any(Function)
    );
  });

  it("calls runUpdate when the scheduled tick fires and shouldSkip is false", () => {
    mockShouldSkip.mockReturnValue(false);
    const mockCron = makeMockCron();
    startPriceCheckCron(mockCron);
    mockRunUpdate.mockClear();

    // Extract and invoke the scheduled callback
    const callback = (mockCron.schedule as jest.Mock).mock.calls[0][1] as () => void;
    callback();

    expect(mockRunUpdate).toHaveBeenCalledTimes(1);
  });

  it("does not call runUpdate when the scheduled tick fires and shouldSkip is true", () => {
    mockShouldSkip.mockReturnValue(true);
    const mockCron = makeMockCron();
    startPriceCheckCron(mockCron);
    mockRunUpdate.mockClear();

    const callback = (mockCron.schedule as jest.Mock).mock.calls[0][1] as () => void;
    callback();

    expect(mockRunUpdate).not.toHaveBeenCalled();
  });
});
