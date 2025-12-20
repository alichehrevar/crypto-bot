import React from "react";

import PreLaunchHeader from "@/components/pre-launch/layouts/PreLaunchHeader";
import PreLaunchFooter from "@/components/pre-launch/layouts/PreLaunchFooter";

export default function PreLunchLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <PreLaunchHeader />
            <div className="flex flex-col overflow-hidden relative">
                <div className="flex flex-col items-center justify-start min-h-screen pt-10">
                    {children}
                </div>
            </div>
            <PreLaunchFooter />
        </>
    )
}
