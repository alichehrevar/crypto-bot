'use client'

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MenuItems } from "@/utils/menuItems";
import { usePathname } from "next/navigation";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Input,
  DropdownItem,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  Avatar,
} from "@heroui/react";
import { SearchIcon } from "@/components/shared/icons";
import { siteConfig } from "@/config/site";
import { ArrowLeftStartOnRectangle, Cog8ToothIcon } from "@/utils/icons";

export default function TopMenu() {

  const pathname = usePathname();

  return (
    <Navbar
      isBordered
      shouldHideOnScroll
      maxWidth="full"
    >
      <NavbarContent justify="start" className="flex flex-1">
        <NavbarBrand>
          <div className="w-[128px] h-[32px] flex items-center justify-center">
            <Link href="/dashboard">
              <Image
                priority
                alt={siteConfig.name}
                height={32}
                src="/images/logos/logotype-white.png"
                width={128}
              />
            </Link>
          </div>
        </NavbarBrand>
        <NavbarContent className="flex items-center justify-center gap-8">
          {Object.values(MenuItems).map((menuItem, i) => {
            const isActive = menuItem.link === pathname || menuItem.children.some(c => c.link === pathname);
            if (menuItem.children.length) {
              return (
                <Dropdown placement="bottom-start" key={i}>
                  <DropdownTrigger>
                    <span className={`text-[14px] font-light cursor-pointer ${isActive ? "text-primary" : ""}`}>
                      {menuItem.name}
                    </span>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Bots List" variant="flat">
                    {menuItem.children.map((child, j) => {
                      const childActive = pathname === child.link;

                      return (
                        <DropdownItem
                          key={j}
                          href={child.link}
                          className={`flex items-center space-x-3 px-4 py-2 rounded-full hover:bg-none ${childActive ? "text-primary" : ""}`}
                          classNames={{
                            base: "text-sm data-[hover=true]:bg-unset data-[hover=true]:text-primary-200 data-[focus=true]:bg-unset data-[focus=true]:text-primary-200",
                          }}
                        >
                          <span className="text-[14px]">{child.name}</span>
                        </DropdownItem>
                      );
                    })}
                  </DropdownMenu>
                </Dropdown>
              )
            }
            return (
              <NavbarItem isActive={isActive} key={i}>
                <Link href={menuItem.link} className={`text-sm ${isActive ? 'text-primary' : 'hover:text-primary-200'}`}>
                  {menuItem.name}
                </Link>
              </NavbarItem>
            );
          })}
        </NavbarContent>
        <NavbarContent as="div" className="items-center" justify="end">
          <Input
            classNames={{
              base: "max-w-full sm:max-w-[12rem] h-10",
              mainWrapper: "h-full",
              input: "text-small",
              inputWrapper:
                "h-full font-normal text-default-500 bg-default-400/20 dark:bg-default-500/20",
            }}
            placeholder="Type to search..."
            size="sm"
            startContent={<SearchIcon />}
            type="search"
          />
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                isBordered
                as="button"
                className="transition-transform"
                color="primary"
                name="Jason Hughes"
                size="sm"
                src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile Actions" variant="flat">
              <DropdownItem key="profile" className="h-14 border-b-1 border-gray-700 pb-4 mb-2 rounded-none gap-2">
                <p className="font-semibold">Signed in as</p>
                <p className="font-semibold">zoey@example.com</p>
              </DropdownItem>
              <DropdownItem key="settings" startContent={<Cog8ToothIcon className="w-5 h-5" />} href="/profile/settings">
                Settings
              </DropdownItem>
              <DropdownItem key="help" startContent={<Cog8ToothIcon className="w-5 h-5" />} href="/profile/settings">
                Help
              </DropdownItem>
              <DropdownItem key="logout" startContent={<ArrowLeftStartOnRectangle className="w-5 h-5" />}>
                Log Out
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarContent>
      </NavbarContent>

    </Navbar>
  )
}
