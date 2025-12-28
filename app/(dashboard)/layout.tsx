// app/(dashboard)/layout.tsx
import React from "react";
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <div className="min-h-screen relative">
            <Sidebar />
            {/* Main content wrapper with sidebar padding */}
            <main className="md:pl-64 min-h-screen flex flex-col bg-black transition-all duration-300">
                <MobileHeader />
                <div className="mx-auto w-full max-w-400 p-4 md:p-8 lg:p-12">
                    {children}
                </div>
            </main>
        </div>
    )
}
