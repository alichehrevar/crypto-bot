import React from "react";

import PreLaunchHeader from "@/components/pre-launch/layouts/PreLaunchHeader";

export default function PreLunchLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <PreLaunchHeader minimal={true} />
            <div className="flex flex-col overflow-hidden relative bg-white">
                <div className="flex flex-col items-center justify-start min-h-[calc(100svh-70px)]">
                    {children}
                </div>
            </div>
        </>
    )
}
