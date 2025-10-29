'use client'

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {
    Navbar,
    NavbarBrand,
    NavbarContent,
    NavbarItem,
    DropdownItem,
    DropdownTrigger,
    Dropdown,
    DropdownMenu,
} from "@heroui/react";

import {MenuItems} from "@/utils/menuItems";
import {siteConfig} from "@/config/site";
import UserDropDown from "@/components/UserDropDown";

export default function TopMenu() {

    const pathname = usePathname();

    return (
        <Navbar
            isBordered
            maxWidth="full"
        >
            <NavbarContent className="flex flex-1" justify="start">
                <NavbarBrand>
                    <div className="w-[160px] h-[68px] flex items-center justify-center">
                        <Link className="w-[160px] h-[68px] relative" href="/dashboard">
                            <Image
                                fill
                                priority
                                alt={siteConfig.name}
                                className="object-contain"
                                src="/images/logos/logotype-white.png"
                            />
                        </Link>
                    </div>
                </NavbarBrand>
                <NavbarContent className="flex items-center justify-center gap-8 h-[66px]">
                    {Object.values(MenuItems).map((menuItem, i) => {
                        const isActive = menuItem.link === pathname || menuItem.children.some(c => c.link === pathname);

                        if (menuItem.children.length) {
                            return (
                                <Dropdown
                                    key={i}
                                    classNames={{
                                        content: 'mt-[-6px]'
                                    }}
                                    placement="bottom"
                                >
                                    <DropdownTrigger
                                        className={`h-full flex items-center ${isActive ? 'border-b-1.5' : ''}`}>
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
                                                    className={`flex items-center space-x-3 px-4 py-2 rounded-full hover:bg-none ${childActive ? "text-primary" : ""}`}
                                                    classNames={{
                                                        base: "text-sm data-[hover=true]:bg-unset data-[hover=true]:text-primary-200 data-[focus=true]:bg-unset data-[focus=true]:text-primary-200",
                                                    }}
                                                    href={child.link}
                                                >
                                                    <span className={`text-[14px] ${child.className ?? ''}`}>{child.name}</span>
                                                </DropdownItem>
                                            );
                                        })}
                                    </DropdownMenu>
                                </Dropdown>
                            )
                        }

                        return (
                            <NavbarItem key={i} className={`h-full flex items-center ${isActive ? 'border-b-1.5' : ''}`}
                                        isActive={isActive}>
                                <Link className={`text-sm ${isActive ? 'text-primary' : 'hover:text-primary-200'}`}
                                      href={menuItem.link}>
                                    {menuItem.name}
                                </Link>
                            </NavbarItem>
                        );
                    })}
                </NavbarContent>
                <NavbarContent as="div" className="items-center" justify="end">
                    <UserDropDown />
                </NavbarContent>
            </NavbarContent>

        </Navbar>
    )
}
