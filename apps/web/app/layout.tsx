import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Big_Shoulders } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-display",
  adjustFontFallback: false,
});
const text = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-text",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "What's that song?",
  description:
    "Paste an Instagram, X, YouTube, Pinterest or TikTok link and find out which songs play in it.",
};

export const viewport: Viewport = {
  themeColor: "#1c1633",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
