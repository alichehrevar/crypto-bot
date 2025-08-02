'use client'

import Image from "next/image";


export default function PageTitleSection({ title, imagePath }: { title: string, imagePath?: string }) {

  return (
    <div className="flex items-center justify-between w-full gap-6 bg-dark-gray backdrop-blur-sm rounded-xl p-4 min-h-[80px]">
      <h1 className="text-xl font-bold text-white">{title}</h1>
      {imagePath &&
        <Image alt={title} height={40} src={imagePath} width={120} />
      }
    </div>
  );
};
