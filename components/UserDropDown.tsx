'use client'

import React from "react";
import { observer } from "mobx-react";
import { useRouter } from "next/navigation"; // [FIX 3] Import useRouter
import { addToast, Avatar, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";

import { useUserStore } from '@/hooks/useUserStore';
import {
    ArrowLeftStartOnRectangle,
    ClipboardDocumentList,
    Cog8ToothIcon,
    MagnifyingGlass,
    SupportIcon
} from "@/utils/icons";
import { logoutAction } from "@/actions/post";
import UserDropDownLoading from "@/components/loading/UserDropDownLoading";

const UserDropDown = observer(() => {
    // Initialize the Next.js router
    const router = useRouter();

    const userStore = useUserStore(); // Initialize the store via the hook

    // The loading state is now simpler and more reliable
    const isLoading = !userStore.isInitialized;

    function logout() {
        logoutAction('/logout')
            .then(() => {
                userStore.removeUser();
                // Use router.push for a smooth client-side redirect
                router.push('/login');
            })
            .catch(err => {
                addToast({
                    title: err.message,
                    color: 'danger'
                });
            });
    }

    if (isLoading) {
        return <UserDropDownLoading />;
    }

    if (!userStore.userData) {
        return null;
    }

    return (
        <Dropdown placement="bottom-end">
            <DropdownTrigger>
                <Avatar
                    isBordered
                    as="button"
                    className="transition-transform"
                    color="primary"
                    name={userStore.userData.info?.firstName + ' ' + userStore.userData.info?.lastName}
                    size="sm"
                    src={process.env.CDN_URL! + userStore.userData.info?.avatar || '/images/icons/default.svg'}
                />
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile Actions" variant="flat" onAction={(key) => {
                if (key === 'logout') {
                    logout();
                }
            }}>
                <DropdownItem
                    key="profile"
                    isReadOnly
                    className="h-14 border-b-1 border-gray-700 pb-4 mb-2 rounded-none gap-2"
                >
                    <p className="font-semibold">Signed in as</p>
                    <p className="font-semibold">{userStore.userData.email}</p>
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
                    href="/help-center"
                    startContent={<SupportIcon className="w-5 h-5" stroke="#ffffff" />}
                >
                    Help
                </DropdownItem>
                <DropdownItem
                    key="terms"
                    href="/terms"
                    startContent={<ClipboardDocumentList className="w-5 h-5" />}
                >
                    Terms
                </DropdownItem>
                <DropdownItem
                    key="logout"
                    startContent={<ArrowLeftStartOnRectangle className="w-5 h-5"/>}
                >
                    Log Out
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );
});

export default UserDropDown;
