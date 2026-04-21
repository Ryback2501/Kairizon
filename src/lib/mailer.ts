import nodemailer from "nodemailer";
import type { AppSettingsData } from "@/repositories/IAppSettingsRepository";

export function createTransporter(settings: AppSettingsData) {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });
}
