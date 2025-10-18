import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { PerformanceProvider } from "../context/PerformanceContext";
import Navbar from "../components/Navbar";

export const metadata = {
  title: {
    default: "RealTea — Because reality deserves receipts",
    template: "%s | RealTea"
  },
  description: "Track verified events, explore timelines, and discover the truth behind the stories that shape our world. A living timeline of real events with AI-powered fact-checking and community verification.",
  keywords: ["timeline", "events", "history", "facts", "verification", "truth", "real events", "fact checking"],
  authors: [{ name: "RealTea" }],
  creator: "RealTea",
  publisher: "RealTea",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  
  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "RealTea — Because reality deserves receipts",
    description: "Track verified events, explore timelines, and discover the truth behind the stories that shape our world.",
    siteName: "RealTea",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RealTea - Reality Timeline",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "RealTea — Because reality deserves receipts",
    description: "Track verified events, explore timelines, and discover the truth behind the stories that shape our world.",
    images: ["/og-image.png"],
    creator: "@realtea",
  },
  
  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  
  // Manifest
  manifest: "/manifest.json",
  
  // Additional Meta
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Verification
  verification: {
    // google: 'your-google-site-verification',
    // yandex: 'your-yandex-verification',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#111827" />
      </head>
      <body className="dark:bg-gray-900 dark:text-white bg-gray-900 text-white min-h-screen antialiased">
        <ThemeProvider>
          <PerformanceProvider>
            <AuthProvider>
              <Navbar />
              <main className="w-full min-h-screen pt-20">
                {children}
              </main>
            </AuthProvider>
          </PerformanceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


