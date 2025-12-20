'use client';

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ActiveLink({
                                       href,
                                       children,
                                       className
                                   }: {
    href: string,
    children: React.ReactNode,
    className?: string
}) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            className={`${className} ${isActive ? 'text-white font-semibold' : ''}`}
            href={href}
        >
            {children}
        </Link>
    );
}
