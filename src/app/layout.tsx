import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { UserProvider } from "@/contexts/UserContext";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hyperlink Inventory",
  description: "Software inventory management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UserProvider>
          <Navbar />
          <main className="mx-auto w-full max-w-6xl px-3 sm:px-4 py-4 sm:py-8">
            {children}
          </main>
          <Footer />
          <Toaster position="top-right" richColors />
        </UserProvider>
      </body>
    </html>
  );
}
