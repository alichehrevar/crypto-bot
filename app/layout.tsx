// app/layout.tsx
import React from "react";
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'United Algos Admin',
    description: 'A high-fidelity, dark-themed admin dashboard for algorithmic trading management',
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-black text-zinc-300 min-h-screen`}>
                {children}
            </body>
        </html>
    )
}
