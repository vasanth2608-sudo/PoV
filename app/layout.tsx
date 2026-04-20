import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POV QR Photo Challenge",
  description: "QR-based event photo collection app backed by Google Drive.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
