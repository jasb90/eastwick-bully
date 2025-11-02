// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eastwick Bully",
  description: "Digital Manifesto — Tag Wall, Music, and Message",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // NOTE: Nothing here should use Date.now(), Math.random(), or window.
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
