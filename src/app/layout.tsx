import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

const title = "Repurpose AI — Turn Any Ad Into Your AI Commercial";
const description =
  "Upload any advertisement. Our AI understands the strategy, rewrites it for your brand, and generates a brand-new cinematic commercial in minutes.";
const previewImage =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bbf24a79-aab3-4b09-aac2-f7dfd891fe64/id-preview-83ebde6e--65b0f76e-f12c-4d3c-bc92-bfa0e97884bb.lovable.app-1783420451471.png";

export const metadata: Metadata = {
  title,
  description,
  authors: [{ name: "Repurpose AI" }],
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title,
    description,
    type: "website",
    images: [previewImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [previewImage],
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
