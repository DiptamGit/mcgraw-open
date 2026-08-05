import type { Metadata } from "next";
import { Anton, Inter, Roboto_Mono } from "next/font/google";
import { SiteShell } from "@/components/site-shell";
import "./globals.css";

const siteUrl = "https://mcgrawopen.com";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

const anton = Anton({
  subsets: ["latin"],
  variable: "--font-anton",
  weight: ["400"],
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "McGraw Open 2026",
    template: "%s | McGraw Open",
  },
  description:
    "Official tournament site for the 2026 McGraw Open doubles tennis tournament.",
  applicationName: "McGraw Open",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "McGraw Open",
    title: "McGraw Open 2026",
    description:
      "Schedules, results, and group standings for the 2026 McGraw Open doubles tennis tournament.",
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "McGraw Open 2026 doubles tennis tournament",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "McGraw Open 2026",
    description:
      "Schedules, results, and group standings for the 2026 McGraw Open doubles tennis tournament.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${anton.variable} ${robotoMono.variable}`}
    >
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
