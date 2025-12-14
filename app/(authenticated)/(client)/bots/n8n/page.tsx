'use client'

import React from "react";

import BotsListTable from "@/components/bots/BotsListTable";

export default function N8nBotsListPage () {
    return (
        <div className="no-scrollbar mx-auto w-[97%] h-screen overflow-y-auto pt-8 relative px-5 space-y-2">
            <div className="grid grid-cols-1 mt-2 rounded-lg h-[34%]">
                <BotsListTable listType="technical" />
            </div>
        </div>
    )
}
