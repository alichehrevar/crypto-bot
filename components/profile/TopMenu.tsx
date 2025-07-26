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
            <Image
              priority
              alt={siteConfig.name}
              height={32}
              src="/images/logos/logotype-white.png"
              width={128}
            />
          </div>
        </NavbarBrand>
        <NavbarContent className="flex items-center justify-center gap-5">
          {Object.values(MenuItems).map((menuItem, i) => {
            const isActive = menuItem.link === pathname || menuItem.children.some(c => c.link === pathname);
            return (
              <NavbarItem isActive={isActive} key={i}>
                <Link color={isActive ? 'primary' : 'foreground'} href={menuItem.link} className="text-sm hover:text-primary-200">
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
                color="secondary"
                name="Jason Hughes"
                size="sm"
                src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile Actions" variant="flat">
              <DropdownItem key="profile" className="h-14 gap-2">
                <p className="font-semibold">Signed in as</p>
                <p className="font-semibold">zoey@example.com</p>
              </DropdownItem>
              <DropdownItem key="settings">My Settings</DropdownItem>
              <DropdownItem key="team_settings">Team Settings</DropdownItem>
              <DropdownItem key="analytics">Analytics</DropdownItem>
              <DropdownItem key="system">System</DropdownItem>
              <DropdownItem key="configurations">Configurations</DropdownItem>
              <DropdownItem key="help_and_feedback">Help & Feedback</DropdownItem>
              <DropdownItem key="logout" color="danger">
                Log Out
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarContent>
      </NavbarContent>

    </Navbar>
  )
}
