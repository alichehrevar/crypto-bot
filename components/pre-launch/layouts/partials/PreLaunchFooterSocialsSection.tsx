import Image from "next/image";

import {PrelaunchFooterSocials} from "@/utils/prelaunch/prelaunchItems";

export default function PreLaunchFooterSocialsSection() {
    return (
        <div className="flex items-center justify-center gap-4">
            {PrelaunchFooterSocials.map((item, index) => (
                <a
                    key={index}
                    className="bg-[#F2F3F74D] w-[32px] h-[32px] flex items-center justify-center rounded-full relative"
                    href={item.link}
                    rel="noreferrer"
                    target="_blank"
                >
                    <div className={`relative ${index % 2 === 0 ? 'w-[20px] h-[20px]' : 'w-[15px] h-[15px]'}`}>
                        <Image fill alt={item.title} className="object-contain" src={item.icon} />
                    </div>
                </a>
            ))}
        </div>
    )
}
