import Link from "next/link";
import React from "react";

import {PrelaunchFooterMenus} from "@/utils/prelaunch/prelaunchFooterMenus";

export default function PreLaunchFooterMenus() {
    return (
        <section className="flex items-center justify-center gap-3 flex-nowrap">
            {PrelaunchFooterMenus.map((item, index) => {
                return (
                    <React.Fragment key={index}>
                        <Link className="text-[#C4C4C4] text-sm" href={item.link}>
                            {item.title}
                        </Link>
                        {index < PrelaunchFooterMenus.length - 1 &&
                            <span className="text-[#C4C4C4]">•</span>
                        }
                    </React.Fragment>
                )
            })}
        </section>
    )
}
