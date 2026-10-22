import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// Una sola familia para todo; la jerarquía sale del peso y el tamaño.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Taquímetro",
  description: "Ranking colaborativo y en vivo de taquerías de CDMX.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
