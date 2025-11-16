import React from "react";

import PreLaunchHeader from "@/components/pre-launch/layouts/PreLaunchHeader";

export default function PreLunchLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <div className="flex flex-col items-center justify-center min-h-screen">
                {children}
            </div>
        </>
    )
}
