import ActiveLink from "./ActiveLink";

import { PrelaunchHeaderMenus } from "@/utils/prelaunch/prelaunchItems";

export default function PreLaunchHeaderMenus({ className = 'flex' }: { className?: string }) {

    return (
        <div className={`${className} items-center justify-center flex-col lg:flex-row gap-8`}>
            {PrelaunchHeaderMenus.map((item, index) => (
                <ActiveLink
                    key={index}
                    className="text-[14px] text-[#DDDDDD]"
                    href={item.link}
                >
                    {item.title}
                </ActiveLink>
            ))}
        </div>
    )
}
