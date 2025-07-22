'use client'

import Image from "next/image";


export default function PageTitleSection({ title, imagePath }: { title: string, imagePath?: string }) {

  return (
    <div className="flex items-center justify-between w-full gap-6 bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50 min-h-[80px]">
      <h1 className="text-xl font-bold text-white">{title}</h1>
      {imagePath &&
        <Image src={imagePath} width={120} height={40} alt={title} />
      }
    </div>
  );
};
