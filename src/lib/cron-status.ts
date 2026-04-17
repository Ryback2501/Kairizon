export interface CronStatus {
  lastRunAt: string | null;      // ISO string
  lastRunDurationMs: number | null;
  lastRunSuccess: boolean | null;
  currentlyRunning: boolean;
}

export const cronStatus: CronStatus = {
  lastRunAt: null,
  lastRunDurationMs: null,
  lastRunSuccess: null,
  currentlyRunning: false,
};
