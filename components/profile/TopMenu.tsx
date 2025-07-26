'use client'

import React from "react";
import Image from "next/image";
import { MenuItems } from "@/utils/menuItems";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopMenu() {

  const pathname = usePathname();

  return (
    <div className="flex items-center justify-center px-4 w-full h-[60px] shadow-lg dark:bg-black">
      <div className="flex items-center justify-center h-16">
        <Image
          priority
          alt="TradingX"
          className="object-contain"
          height={32}
          src="/images/logos/logotype-white.png"
          width={128}
        />
      </div>
      {/* nav items */}
      <nav className="flex items-center justify-center flex-1 overflow-y-auto">
        {Object.values(MenuItems).map((menuItem, i) => {
          const isActive = menuItem.link === pathname || menuItem.children.some(c => c.link === pathname);
          return (
            <Link
              key={i}
              className={`flex items-center space-x-3 px-4 py-2 rounded-full mb-2
              ${isActive ? "text-primary font-bold" : "hover:text-primary-200"}
            `}
              href={menuItem.link}
            >
              {/*<menuItem.Icon className="w-5 h-5 flex-shrink-0" />*/}
              <span className="font-sm text-[13px]">{menuItem.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  )
}
