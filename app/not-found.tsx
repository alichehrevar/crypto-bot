import React from "react";
import Image from "next/image";
import Link from 'next/link'

import {HomeIcon} from "@/utils/icons";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center gap-8">
            <div className="relative w-[80px] aspect-square mb-6">
                <Image fill alt="united-algos" className="object-contain" src="/assets/images/logos/logo-white.png" />
            </div>
            <h3 className="bg-gradient-to-b from-white to-[#999999] bg-clip-text text-transparent text-9xl font-sans font-extrabold">404</h3>
            <h2 className="text-2xl font-bold">Page not found</h2>
            <p className="">The page you’re looking or doesn&#39;t exist or has been moved.</p>
            <Link
                className="text-[#030303] bg-white px-7 py-2.5 rounded-3xl font-semibold flex items-center gap-1"
                href="/"
            >
                <HomeIcon className="size-5 stroke-2" />
                <span>Back to Homepage</span>
            </Link>
        </div>
    )
}
