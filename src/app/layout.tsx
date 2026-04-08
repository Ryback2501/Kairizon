import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Kairizon — Amazon Price Tracker",
  description: "Track Amazon prices and get alerted when they drop.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-brand-canvas text-brand-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
