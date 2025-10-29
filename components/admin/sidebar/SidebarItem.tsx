"use client";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";

import { ChevronRightIcon } from "@/utils/icons";

export type NavItem = {
    label: string;
    href?: string;
    children?: Array<{ label: string; href: string }>;
};

function normalize(path: string) {
    if (!path) return path;

    return path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
}

export default function SidebarItem({ item }: { item: NavItem }) {
    const pathname = usePathname();
    const current = useMemo(() => normalize(pathname), [pathname]);

    // ✅ only mark as active when it matches EXACTLY the item's href (not startsWith)
    const hrefNorm = item.href ? normalize(item.href) : undefined;
    const isActive = !!hrefNorm && current === hrefNorm;

    // ✅ auto-open parent if any child matches the beginning of the current path
    const isChildActive = item.children?.some((c) => current.startsWith(normalize(c.href)));
    const [open, setOpen] = useState<boolean>(() => Boolean(isChildActive));

    const base =
        "flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition";
    const active = isActive ? "bg-white/10" : "";

    return (
        <div>
            {item.href ? (
                <Link aria-current={isActive ? "page" : undefined} className={`${base} ${active}`} href={item.href}>
                    <span>{item.label}</span>
                </Link>
            ) : (
                <button
                    aria-controls={`submenu-${item.label}`}
                    aria-expanded={open}
                    className={`${base} ${open ? "bg-white/10" : ""} w-full text-left`}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                >
                    <span>{item.label}</span>
                    <motion.span animate={{ rotate: open ? 90 : 0 }} className="text-white/60">
                        <ChevronRightIcon />
                    </motion.span>
                </button>
            )}

            <AnimatePresence initial={false}>
                {item.children && (
                    <motion.div
                        key="submenu"
                        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
                        className="overflow-hidden ml-1"
                        exit={{ height: 0, opacity: 0 }}
                        id={`submenu-${item.label}`}
                        initial={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="pl-2 border-l border-white/10 mt-2 space-y-1">
                            {item.children.map((c) => {
                                const childActive = current === normalize(c.href);

                                return (
                                    <Link
                                        key={c.href}
                                        aria-current={childActive ? "page" : undefined}
                                        className={`block px-3 py-2 rounded-lg hover:bg-white/5 text-sm ${
                                            childActive ? "bg-white/10" : ""
                                        }`}
                                        href={c.href}
                                    >
                                        {c.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
