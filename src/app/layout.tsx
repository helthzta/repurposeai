import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

const title = "Repurpose AI — Turn Any Ad Into Your AI Commercial";
const description =
  "Upload any advertisement. Our AI understands the strategy, rewrites it for your brand, and generates a brand-new cinematic commercial in minutes.";

// TODO: add a real branded screenshot to public/ and reference it here as the
// openGraph/twitter `images` field. The previous value pointed at a Lovable
// scaffold preview screenshot, not this app — removed rather than ship a
// stale/foreign image.
export const metadata: Metadata = {
  title,
  description,
  authors: [{ name: "Repurpose AI" }],
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title,
    description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
