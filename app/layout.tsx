// app/layout.tsx
import React from "react";
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import {siteConfig} from "@/config/site";
import { ToastProvider } from '@/components/providers/ToastProvider';
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: {
        default: siteConfig.name,
        template: `%s - ${siteConfig.name}`,
    },
    description: siteConfig.description,
    keywords: siteConfig.keywords,
    icons: {
        icon: "/images/logos/white/favicon.ico",
    },
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-black text-zinc-300 min-h-screen`}>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </body>
        </html>
    )
}
