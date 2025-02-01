import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/navigation";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
    display: 'swap',
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
    display: 'swap',
});

export const metadata: Metadata = {
    title: "Crypto Trading Dashboard",
    description: "Real-time cryptocurrency trading analytics and bot management",
    keywords: ["crypto", "trading", "bitcoin", "ethereum", "dashboard", "analytics"],
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50 dark:bg-gray-900`}
        >
        <div className="min-h-screen flex flex-col">
            <Navigation />

            <main className="flex-1 container mx-auto px-4 py-6">
                {children}
            </main>

            {/* <Footer /> */}
        </div>
        </body>
        </html>
    );
}
