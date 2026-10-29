import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECHOES — Podcast Website",
  description: "Unfiltered conversations with innovators, creators, and disruptors—no scripts, just real talk.",
  icons: { icon: "/assets/FHqgBnR0XyCsm2aOuWO77BRtgU.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="stylesheet" href="/styles/fonts.css" /><meta name="theme-color" content="#101010" /></head><body><a className="voxen-skip-link" href="#page-content">Skip to content</a><div id="page-content">{children}</div></body></html>;
}
