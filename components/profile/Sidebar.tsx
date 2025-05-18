'use client'

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input, Accordion, AccordionItem } from "@heroui/react";
import {
  ArrowLeftStartOnRectangle,
  ChevronLeftIcon,
  ChevronRightIcon, Cog8ToothIcon
} from "@/utils/icons";
import { MenuItems } from "@/utils/menuItems";

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`relative flex flex-col h-full
      bg-black text-white px-3
      ${collapsed ? "w-20" : "w-64"}
      transition-width duration-300
      overflow-hidden
    `}>
      {/* collapse/expand button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-4 bg-black p-1 rounded-full shadow-lg"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed
          ? <ChevronRightIcon className="w-5 h-5 text-gray-400" />
          : <ChevronLeftIcon className="w-5 h-5 text-gray-400" />}
      </button>

      {/* logo */}
      <div className="flex-shrink-0 flex items-center justify-center h-16 mt-4">
        <Image
          src="/images/logos/logo.png"
          alt="TradingX"
          width={collapsed ? 32 : 128}
          height={collapsed ? 32 : 32}
          className="object-contain"
          priority
        />
      </div>

      {/* search (hide when collapsed) */}
      {!collapsed && (
        <div className="px-2 mt-4 rounded-full">
          <Input placeholder="Search…" size="md" className="bg-white/10 text-white placeholder-gray-400 rounded-full" />
        </div>
      )}

      {/* nav items */}
      <nav className="flex-1 overflow-y-auto mt-4 px-2">
        {Object.values(MenuItems).map((menuItem, i) => {
          const isActive = menuItem.link === pathname
            || menuItem.children.some(c => c.link === pathname);

          if (menuItem.children.length) {
            return (
              <Accordion key={i} className="mb-2 bg-transparent">
                <AccordionItem
                  title={
                    <div className="flex items-center space-x-3 px-2 rounded-full">
                      {/*<menuItem.Icon className="w-5 h-5 flex-shrink-0" />*/}
                      {!collapsed && <span className="flex-1 font-medium text-[14px]">{menuItem.name}</span>}
                    </div>
                  }
                  classNames={{
                    content: collapsed ? 'hidden' : ''
                  }}
                >
                  <ul className="flex flex-col space-y-1">
                    {menuItem.children.map((child, j) => {
                      const childActive = pathname === child.link;
                      return (
                        <li key={j}>
                          <Link
                            href={child.link}
                            className={`
                              flex items-center space-x-3 px-4 py-2 rounded-full
                              ${childActive ? "text-primary" : "hover:bg-white/10"}
                            `}
                          >
                            {/*<child.Icon className="w-4 h-4" />*/}
                            {!collapsed && <span className="text-[14px]">{child.name}</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionItem>
              </Accordion>
            );
          }

          return (
            <Link
              key={i}
              href={menuItem.link}
              className={`flex items-center space-x-3 px-4 py-2 rounded-full mb-2
                ${isActive ? "bg-default-100" : "hover:bg-white/10"}
              `}
            >
              {/*<menuItem.Icon className="w-5 h-5 flex-shrink-0" />*/}
              {!collapsed && <span className="font-medium text-[14px]">{menuItem.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* footer */}
      <div className="mt-auto mb-4 w-full px-2">
        <hr className="border-default-100 mb-4" />

        <Link
          href="/profile/settings"
          className="flex items-center space-x-3 px-2 py-2 rounded-md hover:bg-white/10"
        >
          <Image
            src="https://i.pravatar.cc/150?u=a04258a2462d826712d"
            alt="User"
            width={32} height={32}
            className="rounded-full"
          />
          {!collapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium">Ricky Smith</p>
              <p className="text-xs text-gray-400">Account Settings</p>
            </div>
          )}
        </Link>

        {!collapsed && (
          <>
            <Link
              href="/profile/settings"
              className="flex items-center space-x-3 px-2 py-2 rounded-md mt-2 hover:bg-white/10"
            >
              <Cog8ToothIcon className="w-5 h-5" />
              <span className="font-medium text-[14px]">Settings</span>
            </Link>
            <button
              onClick={() => {/* logout logic */}}
              className="flex items-center space-x-3 px-2 py-2 rounded-md mt-2 hover:bg-white/10 w-full text-left"
            >
              <ArrowLeftStartOnRectangle className="w-5 h-5" />
              <span className="font-medium text-[14px]">Logout</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
