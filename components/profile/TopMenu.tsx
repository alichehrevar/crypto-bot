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
    Avatar,
} from "@heroui/react";

import {MenuItems} from "@/utils/menuItems";
import {siteConfig} from "@/config/site";
import {
    ArrowLeftStartOnRectangle,
    ChatBubbleOvalLeftEllipsis,
    Cog8ToothIcon,
    MagnifyingGlass,
    SupportIcon
} from "@/utils/icons";

export default function TopMenu() {

    const pathname = usePathname();

    return (
        <Navbar
            isBordered
            shouldHideOnScroll
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
                                                    <span className="text-[14px]">{child.name}</span>
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
                            <DropdownItem
                                key="profile"
                                className="h-14 border-b-1 border-gray-700 pb-4 mb-2 rounded-none gap-2"
                            >
                                <p className="font-semibold">Signed in as</p>
                                <p className="font-semibold">zoey@example.com</p>
                            </DropdownItem>
                            <DropdownItem
                                key="search"
                                startContent={<MagnifyingGlass className="w-5 h-5"/>}
                            >
                                Search
                            </DropdownItem>
                            <DropdownItem
                                key="settings"
                                href="/profile/settings"
                                startContent={<Cog8ToothIcon className="w-5 h-5"/>}
                            >
                                Settings
                            </DropdownItem>
                            <DropdownItem
                                key="help"
                                href="/profile/settings"
                                startContent={<SupportIcon className="w-5 h-5" stroke="#ffffff" />}
                            >
                                Help
                            </DropdownItem>
                            <DropdownItem
                                key="logout"
                                startContent={<ArrowLeftStartOnRectangle className="w-5 h-5"/>}
                            >
                                Log Out
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </NavbarContent>
            </NavbarContent>

        </Navbar>
    )
}
