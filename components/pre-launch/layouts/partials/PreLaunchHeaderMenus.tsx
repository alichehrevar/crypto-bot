import Link from "next/link";

import {PrelaunchHeaderMenus} from "@/utils/prelaunch/prelaunchItems";

export default function PreLaunchHeaderMenus({className = 'flex'} : {className?: string}) {
    return (
        <div className={`${className} items-center justify-center flex-col lg:flex-row gap-8`}>
            {PrelaunchHeaderMenus.map((item, index) => (
                <Link key={index} className="text-[14px] text-[#DDDDDD]" href={item.link}>
                    {item.title}
                </Link>
            ))}
        </div>
    )
}
