'use client';

import React, {useEffect, useState} from "react";
import { observer } from 'mobx-react'; // [1] Import observer and the new hook
import {addToast, Autocomplete, AutocompleteItem, Select, SelectItem, Spinner} from "@heroui/react";
import Image from "next/image";

import { useUserStore } from '@/hooks/useUserStore';
import AccountDetailsLoading from "@/components/loading/profile/AccountDetailsLoading";
import SecuritySettingsLoading from "@/components/loading/profile/SecuritySettingsLoading";
import EditAccountSettingsModal from "@/components/profile/account-tabs/accountSettings/EditAccountSettingsModal";
import Enable2FAModal from "@/components/profile/account-tabs/accountSettings/Enable2FAModal";
import AvatarInput from "@/components/profile/account-tabs/accountSettings/AvatarInput";
import {allTimezones} from "@/utils/timezones";
import {UserResponse} from "@/types/UserType";
import {updateRequest} from "@/actions/put";

// [2] Wrap the component with observer to make it reactive
const AccountSettingsTab = observer(() => {

    const [submitting, setSubmitting] = useState(false);

    const userStore = useUserStore();

    // [4] Derive the loading state directly from the store. The component is now purely reactive.
    const isLoading = !userStore.isInitialized;
    const userData = userStore.userData;

    const [currency, setCurrency] = React.useState<React.Key | null>();
    const [timezone, setTimezone] = React.useState<React.Key | null>();

    useEffect(() => {
        // This check prevents the function from running on the initial component render
        // before the user has made a selection.
        if (currency || timezone) {
            handlePreferenceChange();
        }
    }, [currency, timezone]); // Dependency array

    if (!userStore.userData) {
        return null;
    }

    const handlePreferenceChange = async () => {
        setSubmitting(true)
        try {
            const response: UserResponse = await updateRequest({currency: currency as string, timezone: timezone as string},'/user/preference/update')

            addToast({
                title: response.message,
                color: response.success ? 'success' : 'danger',
            })
        } catch {
            addToast({
                title: "Something went wrong !",
                description: 'Please try again later',
                color: "danger",
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <section
            className="flex flex-col items-start justify-center w-full mx-4 py-10 px-10 gap-10 max-w-4xl ua-card">

            {/* Account Details Section */}
            {isLoading ? (
                <AccountDetailsLoading />
            ) : (
                <>
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center justify-center gap-8">
                            <AvatarInput userStore={userStore} />
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
                        <li className="flex items-center justify-center mt-1">
                            <span className="text-gray-400 w-[200px]">Enable 2FA</span>
                            <Enable2FAModal isEnabled={userStore.userData.enable2Fa} />
                        </li>
                    </ul>
                </div>
            )}

            {/* Preferences Section */}
            <div className="w-full flex items-start justify-center flex-col gap-4">
                <div className="flex items-center justify-between w-full">
                    <h2 className="text-left font-bold">Preferences</h2>
                    {submitting &&
                        <div className="inline h-3 -mt-12 ms-3">
                            <Spinner color="primary" size="sm" variant="wave" />
                        </div>
                    }
                </div>
                <ul className="flex items-start justify-center flex-col gap-4 text-[13px] mt-4">
                    {/*<li className="flex items-center justify-center">*/}
                    {/*    <span className="text-gray-400 w-[200px]">Language</span>*/}
                    {/*    <Select className="w-[300px]" classNames={{ trigger: 'border-[1.4px]' }} placeholder="Select language" variant="bordered">*/}
                    {/*        <SelectItem key="1" textValue={'English'}>English</SelectItem>*/}
                    {/*        <SelectItem key="2" textValue={'Spanish'}>Spanish</SelectItem>*/}
                    {/*        <SelectItem key="3" textValue={'Persian'}>Persian</SelectItem>*/}
                    {/*    </Select>*/}
                    {/*</li>*/}
                    <li className="flex items-center justify-center">
                        <span className="text-gray-400 w-[200px]">Currency</span>
                        <Autocomplete
                            className="w-[300px]"
                            defaultSelectedKey={userData?.info?.currency as string}
                            disabled={submitting}
                            isClearable={false}
                            placeholder="Select currency"
                            variant="bordered"
                            onSelectionChange={setCurrency}
                        >
                            <AutocompleteItem key="dollar" textValue={'Dollar'}>Dollar</AutocompleteItem>
                            <SelectItem key="euro" textValue={'Euro'}>Euro</SelectItem>
                        </Autocomplete>
                    </li>
                    <li className="flex items-center justify-center">
                        <span className="text-gray-400 w-[200px]">Appearance</span>
                        <Select className="w-[300px]" classNames={{ trigger: 'border-[1.4px]' }} selectedKeys={['2']} placeholder="Select appearance" variant="bordered">
                            <SelectItem key="1" textValue={'System'}>System</SelectItem>
                            <SelectItem key="2" textValue={'Dark'}>Dark</SelectItem>
                            <SelectItem key="3" textValue={'Light'}>Light</SelectItem>
                        </Select>
                    </li>
                    <li className="flex items-center justify-center">
                        <span className="text-gray-400 w-[200px]">Timezone</span>
                        <Autocomplete
                            className="w-[300px]"
                            defaultSelectedKey={userData?.info?.timezone as string}
                            disabled={submitting}
                            isClearable={false}
                            placeholder="Select timezone"
                            variant="bordered"
                            onSelectionChange={setTimezone}
                        >
                            {allTimezones.map((timezone) => (
                                <AutocompleteItem key={timezone.value} textValue={timezone.value}>
                                    {timezone.label}
                                </AutocompleteItem>
                            ))}
                        </Autocomplete>
                    </li>
                </ul>
            </div>
        </section>
    );
});

export default AccountSettingsTab;
