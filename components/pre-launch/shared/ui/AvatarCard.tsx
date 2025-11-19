import Image from "next/image";
import React from "react";

export default function AvatarCard({image, name, description}: {image: string, name: string, description: string}) {
    return (
        <div className="flex items-center space-x-4">
            <div className="w-[48px] h-[48px] relative">
                <Image
                    fill
                    alt="Andromeda"
                    className="rounded-full object-cover"
                    src={image}
                />
            </div>
            <div className="text-start">
                <h2 className="text-lg font-semibold text-white">
                    {name}
                </h2>
                <p className="text-sm text-[#757575]">
                    {description}
                </p>
            </div>
        </div>
    )
}
