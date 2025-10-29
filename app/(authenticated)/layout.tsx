import React from "react";

import TopMenu from "@/components/profile/TopMenu";
import SessionHydrator from '@/components/SessionHydrator';

export default function ProfileLayout({
  children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <SessionHydrator />
            <section className="w-screen overflow-x-hidden">
                <div className="flex items-center justify-center flex-col w-full">
                    <div className="hidden lg:flex lg:w-full relative">
                        <TopMenu/>
                    </div>
                    {children}
                </div>
            </section>
        </>
    )
}
