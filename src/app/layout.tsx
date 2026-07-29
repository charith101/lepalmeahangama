import type { Metadata } from "next";
import { Inter, Playfair_Display, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { hotelSchema } from "@/lib/seo";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { APP_URL } from "@/lib/constants";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Le Palme Ahangama",
    template: "%s | Le Palme Ahangama",
  },
  description: "Beachfront hotel in Ahangama, Sri Lanka. Deluxe & Budget rooms, surfboard & bike rentals, airport transfers. Book direct for best rates.",
  keywords: ["hotel", "Ahangama", "Sri Lanka", "beachfront", "surf", "booking"],
  authors: [{ name: "Le Palme Ahangama" }],
  creator: "Le Palme Ahangama",
  publisher: "Le Palme Ahangama",
  formatDetection: { telephone: true },
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Le Palme Ahangama",
    title: "Le Palme Ahangama — Beachfront Hotel in Sri Lanka",
    description: "Beachfront hotel in Ahangama, Sri Lanka. Deluxe & Budget rooms, surfboard & bike rentals, airport transfers.",
    images: [
      { url: "/og-image.jpg", width: 1200, height: 630, alt: "Le Palme Ahangama beachfront view" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Le Palme Ahangama — Beachfront Hotel in Sri Lanka",
    description: "Beachfront hotel in Ahangama, Sri Lanka. Deluxe & Budget rooms, surfboard & bike rentals, airport transfers.",
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
