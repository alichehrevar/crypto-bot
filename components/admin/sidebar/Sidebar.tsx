"use client";
import Link from "next/link";
import Image from "next/image";

import SidebarItem, { NavItem } from "./SidebarItem";

const nav: NavItem[] = [
    { label: "Dashboard", href: "/admin" },
    {
        label: "Users",
        children: [
            { label: "List", href: "/admin/users" },
            { label: "Role", href: "/admin/users/role" }
        ]
    }
];

export default function Sidebar() {
    return (
        <aside className="w-[260px] hidden md:flex flex-col gap-3 p-4 bg-bg-soft/80 backdrop-blur-md border-r border-white/5">
            <Link className="flex items-center gap-2 mb-2" href="/admin">
                <div className="h-10 w-10 border rounded-full relative flex items-center justify-center">
                    <Image
                        alt="United Algos"
                        className="object-cover"
                        height={24}
                        src="/images/logos/logo-white.png"
                        width={24}
                    />
                </div>
                <span className="font-semibold tracking-tight">UNITED ALGOS</span>
            </Link>
            <div className="text-xs uppercase tracking-wider text-white/40 px-3">Overview</div>
            <div className="space-y-1">
                {nav.map((item) => (
                    <SidebarItem key={item.label} item={item} />
                ))}
            </div>
            <div className="mt-auto text-xs text-white/40 px-3">v0.1.0</div>
        </aside>
    );
}
