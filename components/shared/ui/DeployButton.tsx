import React from "react";
import Link from "next/link";

import {ChevronRightIcon} from "@/utils/icons";

export default function DeployButton() {
    return (
        <Link className="flex items-center gap-1 hover:scale-105 transition-all duration-300 bg-white text-black border-1 border-white py-1.5 px-3 rounded-xl" href="/profile/bots">
            <span className="text-xs">Deploy Bot</span>
            <ChevronRightIcon className="size-3" />
        </Link>
    )
}
