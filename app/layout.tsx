import "@/styles/globals.css";
import {Metadata, Viewport} from "next";
import clsx from "clsx";
import React from "react";

import {Providers} from "./providers";

import {siteConfig} from "@/config/site";
import {fontSans} from "@/config/fonts";

export const metadata: Metadata = {
    title: {
        default: siteConfig.name,
        template: `%s - ${siteConfig.name}`,
    },
    description: siteConfig.description,
    keywords: siteConfig.keywords,
    icons: {
        icon: "/assets/images/logos/white/favicon.ico",
    },
};

export const viewport: Viewport = {
    themeColor: [
        {media: "(prefers-color-scheme: light)", color: "white"},
        {media: "(prefers-color-scheme: dark)", color: "black"},
    ],
};

export default function RootLayout({
   children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html suppressHydrationWarning lang="en">
        <body
            className={clsx(
                "bg-background font-sans antialiased relative overflow-x-hidden",
                fontSans.variable,
            )}
        >
        <Providers themeProps={{attribute: "class", defaultTheme: "dark"}}>
            {children}
        </Providers>
        </body>
        </html>
    );
}
