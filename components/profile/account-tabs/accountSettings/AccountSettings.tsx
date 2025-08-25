'use client';

import React from "react";
import { observer } from 'mobx-react'; // [1] Import observer and the new hook
import { Avatar, Select, SelectItem } from "@heroui/react";
import Image from "next/image";

import { useUserStore } from '@/hooks/useUserStore';
import AccountDetailsLoading from "@/components/loading/profile/AccountDetailsLoading";
import SecuritySettingsLoading from "@/components/loading/profile/SecuritySettingsLoading";
import EditAccountSettingsModal from "@/components/profile/account-tabs/accountSettings/EditAccountSettingsModal";

// [2] Wrap the component with observer to make it reactive
const AccountSettingsTab = observer(() => {

    // [3] Initialize the store via the hook. This also triggers the one-time data fetch.
    const userStore = useUserStore();

    // [4] Derive the loading state directly from the store. The component is now purely reactive.
    const isLoading = !userStore.isInitialized;
    const userData = userStore.userData;

    if (!userStore.userData) {
        return null;
    }

    return (
        <section
            className="bg-dark-gray light:bg-white shadow-lg flex flex-col items-start justify-center w-full rounded-lg mx-4 py-10 px-10 gap-10 max-w-4xl">

            {/* Account Details Section */}
            {isLoading ? (
                <AccountDetailsLoading />
            ) : (
                <>
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center justify-center gap-8">
                            <Avatar
                                isBordered
                                as="button"
                                className="w-[60px] h-[60px]  transition-transform"
                                color="primary"
                                name={userStore.userData.info?.firstName + ' ' + userStore.userData.info?.lastName}
                                size="sm"
                                src={userStore.userData.info?.avatar || '/images/icons/default.svg'}
                            />
                            <div className="flex flex-col items-start justify-center text-[13px] gap-4 text-gray-400">
                                <span>Username</span>
                                <span>User ID</span>
                            </div>
                            <div className="flex flex-col items-start justify-center text-[13px] gap-4 dark:text-white text-black">
                                <span>{userData?.email || 'N/A'}</span>
                                <span>{userData?.id || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-start justify-center flex-col gap-4 mt-6">
                        <h2 className="text-left font-bold">Account Details</h2>
                        <ul className="flex items-start justify-center flex-col gap-4 text-[13px] mt-4">
                            <li className="flex items-center justify-center">
                                <span className="text-gray-400 w-[200px]">Full Name</span>
                                <div className="flex items-center justify-center gap-2">
                                    <span>{(userData?.info?.firstName + ' ' + userData?.info?.lastName) || 'N/A'}</span>
                                </div>
                            </li>
                            <li className="flex items-center justify-center">
                                <span className="text-gray-400 w-[200px]">Birthday</span>
                                <span>{userData?.info?.birthday ? new Date(userData.info.birthday).toLocaleDateString() : 'N/A'}</span>
                            </li>
                            <li className="flex items-center justify-center">
                                <span className="text-gray-400 w-[200px]">Connected Accounts</span>
                                <div className="w-[32px] h-[32px] flex items-center justify-center bg-[#283544] rounded-full">
                                    <Image alt="apple logo" height={18} src="/images/icons/apple.png" width={18}/>
                                </div>
                            </li>
                        </ul>
                    </div>
                </>
            )}

            {/* Security Section */}
            {isLoading ? (
                <SecuritySettingsLoading />
            ) : (
                <div className="flex items-start justify-center flex-col w-full gap-4 py-8 border-t-[0.5px] border-b-[0.5px] border-[#c8c8c8] dark:border-[#404040]">
                    <div className="flex items-start justify-between w-full">
                        <h2 className="text-left font-bold">Security</h2>
                        <EditAccountSettingsModal
                            title="Edit Security Information"
                            type="security"
                            userData={userData}
                        />
                    </div>
                    <ul className="flex items-start justify-center flex-col gap-4 text-[13px] mt-1">
                        <li className="flex items-center justify-center">
                            <span className="text-gray-400 w-[200px]">Password</span>
                            <span>**********</span>
                        </li>
                        <li className="flex items-center justify-center">
                            <span className="text-gray-400 w-[200px]">Phone Verification</span>
                            <span>{userData?.info?.phoneNumber ? `(${userData.info.phoneCountry}) ${userData.info.phoneNumber}` : 'N/A'}</span>
                        </li>
                    </ul>
                </div>
            )}

            {/* Preferences Section */}
            <div className="w-full flex items-start justify-center flex-col gap-4">
                <h2 className="text-left font-bold">Preferences</h2>
                <ul className="flex items-start justify-center flex-col gap-4 text-[13px] mt-4">
                    <li className="flex items-center justify-center">
                        <span className="text-gray-400 w-[200px]">Language</span>
                        <Select className="w-[300px]" classNames={{ trigger: 'border-[1.4px]' }} placeholder="Select language" variant="bordered">
                            <SelectItem key="1" textValue={'English'}>English</SelectItem>
                            <SelectItem key="2" textValue={'Spanish'}>Spanish</SelectItem>
                            <SelectItem key="3" textValue={'Persian'}>Persian</SelectItem>
                        </Select>
                    </li>
                    <li className="flex items-center justify-center">
                        <span className="text-gray-400 w-[200px]">Currency</span>
                        <Select className="w-[300px]" classNames={{ trigger: 'border-[1.4px]' }} placeholder="Select currency" variant="bordered">
                            <SelectItem key="1" textValue={'Dollar'}>Dollar</SelectItem>
                            <SelectItem key="2" textValue={'Euro'}>Euro</SelectItem>
                        </Select>
                    </li>
                    <li className="flex items-center justify-center">
                        <span className="text-gray-400 w-[200px]">Appearance</span>
                        <Select className="w-[300px]" classNames={{ trigger: 'border-[1.4px]' }} placeholder="Select appearance" variant="bordered">
                            <SelectItem key="1" textValue={'System'}>System</SelectItem>
                            <SelectItem key="2" textValue={'Dark'}>Dark</SelectItem>
                            <SelectItem key="3" textValue={'Light'}>Light</SelectItem>
                        </Select>
                    </li>
                    <li className="flex items-center justify-center">
                        <span className="text-gray-400 w-[200px]">Timezone</span>
                        <Select className="w-[300px]" classNames={{ trigger: 'border-[1.4px]' }} placeholder="Select timezone" variant="bordered">
                            <SelectItem key="1" textValue={'UTC'}>UTC</SelectItem>
                        </Select>
                    </li>
                </ul>
            </div>
        </section>
    );
});

export default AccountSettingsTab;
