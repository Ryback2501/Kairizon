export interface AppSettingsData {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
}

export function isSettingsConfigured(s: AppSettingsData): boolean {
  return !!(s.smtpHost && s.smtpUser && s.smtpPass && s.smtpFrom);
}

export interface IAppSettingsRepository {
  get(): Promise<AppSettingsData>;
  save(settings: AppSettingsData): Promise<AppSettingsData>;
}
