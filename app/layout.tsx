import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Military Pass — Real-Time AI Face & Voice Transformation",
  description:
    "Military-grade AI identity transformation for streamers, creators and virtual operators. Real-time face swap and voice conversion, powered entirely by cloud AI.",
  keywords: [
    "face swap AI", "voice changer", "real-time AI", "streaming tool",
    "identity transformation", "military pass", "VTuber", "OBS face swap",
  ],
  openGraph: {
    title: "Military Pass — Transform Your Face & Voice In Real Time",
    description: "Cloud-powered AI identity transformation. Zero GPU required.",
    type: "website",
    url: "https://militarypass.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Military Pass",
    description: "Real-Time AI Face & Voice Transformation",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
