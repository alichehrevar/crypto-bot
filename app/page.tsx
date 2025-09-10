'use client'

import Link from "next/link";

import CryptoNews from "@/components/CryptoNews";

export default function Home() {

    return (
        <section className="flex flex-col items-center justify-center gap-4 py-3 px-2 lg:px-4 w-full">
            <div className="flex items-center justify-end w-full">
                <Link href="/dashboard">Dashboard</Link>
            </div>
            <div className="w-full">
                <CryptoNews />
            </div>
        </section>
    );
}
