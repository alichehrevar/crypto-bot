'use client'

import React from "react";
import Image from "next/image";
import { Accordion, AccordionItem } from "@heroui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { MenuItems } from '@/utils/menuItems'

export default function Sidebar() {

  const pathname = usePathname();

  return (
    <div className="dark:bg-black shadow-default light:bg-white shadow-2xl rounded-tr-3xl rounded-br-3xl flex flex-col items-center justify-start h-full w-full px-4 gap-4">
      <div className="flex items-center justify-center w-4/5 h-[140px] relative">
        <Image
          fill
          alt="tradingx"
          className="object-contain object-center"
          src="/images/logos/logo.png"
        />
      </div>
      {Object.values(MenuItems).map((menuItem, index) => (
        <React.Fragment key={index}>
          {menuItem.children.length > 0
            ? (<Accordion>
              <AccordionItem
                key={index}
                aria-label={menuItem.name}
                title={<span className="text-[14px] flex items-center justify-start w-full hover:text-primary transition-all duration-300 font-semibold">
                  {menuItem.name}
                </span>}
              >
                <ul className="flex items-start justify-center flex-col gap-4">
                  {menuItem.children.map((child, childIndex) => (
                    <li key={childIndex}>
                      <Link className={`text-[14px] flex items-center justify-start w-full hover:text-primary transition-all duration-300 px-2 font-semibold ${pathname === child.link ? 'text-primary font-bold' : ''}`} href={child.link}>
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </AccordionItem>
            </Accordion>)
            : <Link className={`text-[14px] flex items-center justify-start w-full hover:text-primary transition-all duration-300 px-2 font-semibold ${pathname === menuItem.link ? 'text-primary font-bold' : ''}`} href={menuItem.link}>
              {menuItem.name}
          </Link>
          }
        </React.Fragment>
      ))}
    </div>
  )
}
