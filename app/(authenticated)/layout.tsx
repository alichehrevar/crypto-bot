import React from "react";

import TopMenu from "@/components/profile/TopMenu";

export default function ProfileLayout({
  children,
}: {
    children: React.ReactNode;
}) {
    return (
        <section className="w-screen overflow-x-hidden">
            <div className="flex items-center justify-center flex-col w-full">
                <div className="hidden lg:flex lg:w-full relative">
                    <TopMenu/>
                </div>
                <div className="flex items-end justify-start h-screen lg:h-[calc(100vh-65px)] pb-3 w-full flex-col gap-4 relative">
                    {children}
                </div>
            </div>
        </section>
    )
}
