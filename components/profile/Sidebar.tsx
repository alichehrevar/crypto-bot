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
import { random } from "nanoid";

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
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-4 bg-black p-1 rounded-full shadow-lg"
        onClick={() => setCollapsed(c => !c)}
      >
        {collapsed
          ? <ChevronRightIcon className="w-5 h-5 text-gray-400" />
          : <ChevronLeftIcon className="w-5 h-5 text-gray-400" />}
      </button>

      {/* logo */}
      <div className="flex-shrink-0 flex items-center justify-center h-16 mt-4">
        <Image
          priority
          alt="TradingX"
          className="object-contain"
          height={collapsed ? 32 : 32}
          src="/images/logos/logo.png"
          width={collapsed ? 32 : 128}
        />
      </div>

      {/* search (hide when collapsed) */}
      {!collapsed && (
        <div className="px-2 mt-4 rounded-full">
          <Input className="bg-white/10 text-white placeholder-gray-400 rounded-full" placeholder="Search…" size="md" />
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
                  classNames={{
                    content: collapsed ? 'hidden' : ''
                  }}
                  title={
                    <div className="flex items-center space-x-3 px-2 rounded-full">
                      {/*<menuItem.Icon className="w-5 h-5 flex-shrink-0" />*/}
                      {!collapsed && <span className="flex-1 font-medium text-[14px]">{menuItem.name}</span>}
                    </div>
                  }
                  textValue={menuItem.name}
                >
                  <ul className="flex flex-col space-y-1">
                    <li key={i * 10}>
                      <Link
                        className={`
                              flex items-center space-x-3 px-4 py-2 rounded-full
                              ${pathname === menuItem.link ? "text-primary" : "hover:bg-white/10"}
                            `}
                        href={menuItem.link}
                      >
                        {/*<child.Icon className="w-4 h-4" />*/}
                        {!collapsed && <span className="text-[14px]">All {menuItem.name}</span>}
                      </Link>
                    </li>
                    {menuItem.children.map((child, j) => {
                      const childActive = pathname === child.link;

                      return (
                        <li key={j}>
                          <Link
                            className={`
                              flex items-center space-x-3 px-4 py-2 rounded-full
                              ${childActive ? "text-primary" : "hover:bg-white/10"}
                            `}
                            href={child.link}
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
              className={`flex items-center space-x-3 px-4 py-2 rounded-full mb-2
                ${isActive ? "bg-default-100" : "hover:bg-white/10"}
              `}
              href={menuItem.link}
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
          className="flex items-center space-x-3 px-2 py-2 rounded-md hover:bg-white/10"
          href="/profile/settings"
        >
          <Image
            alt="User"
            className="rounded-full"
            height={32} src="https://i.pravatar.cc/150?u=a04258a2462d826712d"
            width={32}
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
              className="flex items-center space-x-3 px-2 py-2 rounded-md mt-2 hover:bg-white/10"
              href="/profile/settings"
            >
              <Cog8ToothIcon className="w-5 h-5" />
              <span className="font-medium text-[14px]">Settings</span>
            </Link>
            <button
              className="flex items-center space-x-3 px-2 py-2 rounded-md mt-2 hover:bg-white/10 w-full text-left"
              onClick={() => {/* logout logic */}}
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
