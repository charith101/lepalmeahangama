import type { Metadata } from "next";
import { Inter, Playfair_Display, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { hotelSchema, websiteSchema } from "@/lib/seo";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { APP_URL, HOTEL_SEO_DESCRIPTION, HOTEL_NAME } from "@/lib/constants";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${HOTEL_NAME} — Boutique Hotel in Ahangama, Sri Lanka`,
    template: `%s | ${HOTEL_NAME}`,
  },
  description: HOTEL_SEO_DESCRIPTION,
  applicationName: HOTEL_NAME,
  keywords: [
    "Le Palme Ahangama",
    "boutique hotel Ahangama",
    "Ahangama hotel",
    "Sri Lanka",
    "Ahangama Beach",
    "family rooms",
    "garden view",
    "surfboard rental",
    "bicycle rental",
    "airport shuttle",
    "Ahangama accommodation",
    "southern coast Sri Lanka hotel",
  ],
  authors: [{ name: HOTEL_NAME }],
  creator: HOTEL_NAME,
  publisher: HOTEL_NAME,
  formatDetection: { telephone: true },
  metadataBase: new URL(APP_URL),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: HOTEL_NAME,
    title: `${HOTEL_NAME} — Boutique Hotel in Ahangama, Sri Lanka`,
    description: HOTEL_SEO_DESCRIPTION,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `${HOTEL_NAME} — lush garden and terrace in Ahangama, Sri Lanka`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${HOTEL_NAME} — Boutique Hotel in Ahangama, Sri Lanka`,
    description: HOTEL_SEO_DESCRIPTION,
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
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
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
        <TooltipProvider>
        <PublicNavbar />
        <ErrorBoundary>
        <main className="flex-1">{children}</main>
        </ErrorBoundary>
        <PublicFooter />
        <Toaster />
        </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
