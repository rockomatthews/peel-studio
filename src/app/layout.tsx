import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://peelthis.com"),
  title: "PeelThis — Turn Any Idea Into a Custom Sticker",
  description: "Describe your sticker, approve the artwork, and get it printed and shipped directly to your door.",
  applicationName: "PeelThis",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "PeelThis",
    locale: "en_US",
    title: "PeelThis — Your Idea, Made Sticky",
    description: "Describe it. Approve it. We print and ship your one-of-a-kind custom stickers.",
    images: [
      {
        url: "/peelthis-imessage-preview.png",
        width: 1200,
        height: 630,
        alt: "PeelThis custom sticker creator featuring a blue robot holding a printed sticker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PeelThis — Your Idea, Made Sticky",
    description: "Describe it. Approve it. We print and ship your one-of-a-kind custom stickers.",
    images: ["/peelthis-imessage-preview.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
