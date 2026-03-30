import type { Metadata } from "next";
import { DM_Serif_Display, Poppins } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: "400",
  variable: "--font-dm-serif",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trackline — Conservation Technology for Remote Australia",
  description:
    "Purpose-built tools for ranger teams, researchers, and land managers working in Australia's toughest landscapes. Camera traps, fire management, and remote monitoring — engineered for the field.",
  keywords: [
    "conservation technology",
    "camera trap",
    "fire management",
    "Indigenous land management",
    "remote monitoring",
    "Australia",
    "ranger tools",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${dmSerif.variable} ${poppins.variable} grain antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
