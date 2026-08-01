import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "McGraw Open 2026",
  description:
    "Official tournament site for the 2026 McGraw Open doubles tennis tournament.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
