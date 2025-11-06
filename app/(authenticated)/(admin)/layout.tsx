import React from "react";

import Sidebar from "@/components/admin/sidebar/Sidebar";
import Topbar from "@/components/admin/Topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh">
            <Sidebar />
            <div className="flex-1 flex flex-col gap-6 p-6 md:p-8">
                <Topbar />
                {children}
            </div>
        </div>
    );
}
