'use client'

import { Avatar } from "@heroui/react";

export default function Topbar() {
    return (
        <div className="glass flex items-center justify-between p-3">
            <div className="text-sm text-white/60">Overview</div>
            <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white/10" />
                <Avatar
                    className="h-9 w-9"
                    name="U"
                    src="/images/logos/logo-white.png"
                />
            </div>
        </div>
    );
}
