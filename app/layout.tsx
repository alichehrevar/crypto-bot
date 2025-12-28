// app/layout.tsx
import React from "react";
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
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
        <div className="min-h-screen relative">
            <Sidebar />

            <main className="md:pl-64 min-h-screen flex flex-col bg-black transition-all duration-300">
                <MobileHeader />

                <div className="mx-auto w-full max-w-[1600px] p-4 md:p-8 lg:p-12">
                    {children}
                </div>
            </main>
        </div>
        </body>
        </html>
    )
}
