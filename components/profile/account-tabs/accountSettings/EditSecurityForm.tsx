import React, {FormEvent, useState} from "react";
import {
    addToast,
    Button,
    Form,
} from "@heroui/react";

import {CountryCodes} from "@/utils/countryCodes";
import {User, UserResponse} from "@/types/UserType";
import {updateRequest} from "@/actions/put";
import Combobox from "@/components/shared/ui/Combobox";
import Input from "@/components/shared/ui/Input";

export default function EditSecurityForm(props: { userData: User | null, onClose: () => void }) {

    const [phoneCountry, setPhoneCountry] = useState('+1');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [formLoading, setFormLoading] = React.useState(false);

    async function handleSubmission(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormLoading(true)
        const formData = Object.fromEntries(new FormData(event.currentTarget));

        if (formData.newPassword !== formData.confirmPassword) {
            addToast({
                title: "Passwords do not match",
                description: "New password and confirm password must be the same.",
                color: "danger",
            });
            setFormLoading(false);

            return;
        }



        try {
            const response: UserResponse = await updateRequest(formData, '/user/info/security/update')

            addToast({
                title: response.message,
                color: response.success ? 'success' : 'danger',
            })
            if (response.success) {
                props.onClose()
            }
        } catch {
            addToast({
                title: "Something went wrong !",
                description: 'Please try again later',
                color: "danger",
            })
        } finally {
            setFormLoading(false)
        }
    }

    return (
        <Form className="w-full space-y-2" onSubmit={handleSubmission}>
            <div className="space-y-2 w-full">
                <div className="grid grid-cols-3 gap-2 items-end">
                    <Combobox
                        label="Phone Number"
                        options={CountryCodes.map(country => ({
                            id: country.code,
                            name: `${country.flag}\u00A0${country.code}`,
                        }))}
                        selected={phoneCountry}
                        setSelected={setPhoneCountry}
                    />
                    <Input
                        className="col-span-2"
                        id="phoneNumber"
                        placeholder="724-848-1225"
                        type="tel"
                        onChange={setPhoneNumber}
                    />
                </div>
            </div>
            <div className="space-y-2 w-full">
                <Input
                    id="password"
                    placeholder="Enter your Password"
                    title="Password"
                    type="password"
                />
            </div>
            <div className="space-y-2 w-full">
                <Input
                    id="newpassword"
                    placeholder="Enter your New Password"
                    title="New Password"
                    type="password"
                />
            </div>
            <div className="space-y-2 w-full">
                <Input
                    id="confirmPassword"
                    placeholder="Enter your Password"
                    title="Confirm Password"
                    type="password"
                />
            </div>
            <div className="flex items-center justify-end w-full gap-2">
                <Button
                    className="border-1.5"
                    size="sm"
                    type="button"
                    variant="bordered"
                    onPress={props.onClose}
                >
                    Cancel
                </Button>
                <Button
                    className="border-1 border-green text-green"
                    isLoading={formLoading}
                    size="sm"
                    type="submit"
                    variant="bordered"
                >
                    Submit
                </Button>
            </div>
        </Form>
    )
}
