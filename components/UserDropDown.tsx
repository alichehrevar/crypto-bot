'use client'

import React, {useEffect, useState} from "react";
import { observer } from "mobx-react";
import {addToast, Avatar, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger} from "@heroui/react";

import userStore from '@/hooks/user';
import {ArrowLeftStartOnRectangle, Cog8ToothIcon, MagnifyingGlass, SupportIcon} from "@/utils/icons";
import {logoutAction} from "@/actions/post";
import UserDropDownLoading from "@/components/loading/UserDropDownLoading";

const UserDropDown = observer(() => {

    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        userStore.loadUserFromLocalStorage()
            .then(() => {
                setIsLoaded(true); // Set to true after the component has mounted
            }); // Load user from localStorage
    }, []);


    function logout () {
        // perform logout action
        logoutAction('/logout')
            .then(() => {
                // remove user data from localStorage
                userStore.removeUser()

                // redirect to login page
                window.location.href = '/login'
            })
            .catch(err => {
                // show error toast
                addToast({
                    title: err.message,
                    color: 'danger'
                })
            })
    }

    return (
        <>
            {!isLoaded && <UserDropDownLoading />}
            {isLoaded &&
                <Dropdown placement="bottom-end">
                    <DropdownTrigger>
                        <Avatar
                            isBordered
                            as="button"
                            className="transition-transform"
                            color="primary"
                            name={userStore.userData?.info?.firstName + ' ' + userStore.userData?.info?.lastName}
                            size="sm"
                            src={userStore.userData?.info?.avatar || '/images/icons/default.svg'}
                        />
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Profile Actions" variant="flat">
                        <DropdownItem
                            key="profile"
                            className="h-14 border-b-1 border-gray-700 pb-4 mb-2 rounded-none gap-2"
                        >
                            <p className="font-semibold">Signed in as</p>
                            <p className="font-semibold">{userStore.userData?.email}</p>
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
                            <button className="w-full text-left" onClick={() => logout()}>Log Out</button>
                        </DropdownItem>
                    </DropdownMenu>
                </Dropdown>
            }
        </>
    )
})

export default UserDropDown;
