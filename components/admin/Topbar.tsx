'use client'

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { pageTitles } from "@/utils/admin/MenuItemsList";

export default function Topbar() {

    const pathname = usePathname(); // Get the current pathname string (e.g., /admin/bots/123/logs)
    const [pageTitle, setPageTitle] = useState<string | null>(null);

    useEffect(() => {
        let matchingTitle = null;

        for (const titleItem of pageTitles) {
            // Create a regex from the url pattern
            // This replaces '[id]' with a regex segment that matches
            // one or more characters that are NOT a slash.
            // e.g., /admin/bots/[id]/logs -> /admin/bots/[^/]+/logs
            const regex = new RegExp(
                '^' + titleItem.url.replace(/\[id\]/g, '[^/]+') + '$'
            );

            // Test the current pathname against the regex
            if (regex.test(pathname)) {
                matchingTitle = titleItem.title;
                break; // Found our match, no need to keep looping
            }
        }

        setPageTitle(matchingTitle); // Set the found title (or null if no match)

    }, [pathname]); // This effect will re-run whenever the pathname changes

    return (
        <>
            {pageTitle && (
                <div className="glass flex items-center justify-between px-6 min-h-20">
                    <h1 className="text-2xl font-semibold capitalize">
                        {pageTitle}
                    </h1>
                </div>
            )}
        </>
    );
}
