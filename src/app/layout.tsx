import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Rank America | A Better Way to Vote",
  description: "Explore how ranked-choice voting works, try an interactive election, and discover ways to learn more about voting reform.",
  applicationName: "Rank America",
  icons: { icon: "/icon.png" }
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
