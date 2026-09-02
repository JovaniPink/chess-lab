import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Fraunces, IBM_Plex_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, configuredSiteUrl } from "@/lib/site-config";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-bricolage",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-fraunces",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

export const viewport: Viewport = {
  themeColor: "#173f35",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(configuredSiteUrl),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Jovani Pink" }],
  creator: "Measured Studios",
  publisher: "Measured Studios",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "64x64" },
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icon0", type: "image/png", sizes: "48x48" },
      { url: "/icon1", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  other: { "color-scheme": "light" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: configuredSiteUrl,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${fraunces.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
