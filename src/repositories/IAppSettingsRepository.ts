export type Theme = "light" | "dark";

export interface AppSettingsData {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  theme: Theme;
}

// Theme is a UI preference, not part of "configured" (which gates SMTP).
export function isSettingsConfigured(s: AppSettingsData): boolean {
  return !!(s.smtpHost && s.smtpUser && s.smtpPass && s.smtpFrom);
}

export interface IAppSettingsRepository {
  get(): Promise<AppSettingsData>;
  save(settings: AppSettingsData): Promise<AppSettingsData>;
}
