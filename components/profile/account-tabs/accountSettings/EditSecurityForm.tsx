import React, {FormEvent} from "react";
import {
    addToast, Autocomplete, AutocompleteItem,
    Button,
    Form,
    Input,
} from "@heroui/react";

import {CountryCodes} from "@/utils/countryCodes";
import LabelTag from "@/components/shared/ui/Label";
import {User, UserResponse} from "@/types/UserType";
import {updateRequest} from "@/actions/put";

export default function EditSecurityForm(props: { userData: User | null, onClose: () => void }) {

    const [formLoading, setFormLoading] = React.useState(false);

    async function handleSubmission(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormLoading(true)
        const formData = Object.fromEntries(new FormData(event.currentTarget));

        try {
            const response: UserResponse = await updateRequest(formData, '/user/info/security/update')

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
            setFormLoading(false)
            props.onClose()
        }
    }

    return (
        <Form className="w-full space-y-2" onSubmit={handleSubmission}>
            <div className="space-y-2 w-full">
                <LabelTag id="phone-number" title="Phone Number"/>
                <div className="flex gap-2">
                    <Autocomplete
                        isRequired
                        className="w-[90px]"
                        defaultSelectedKey={props.userData?.info?.phoneCountry}
                        id="country-code"
                        isClearable={false}
                        items={CountryCodes}
                        name="phoneCountry"
                    >
                        {CountryCodes.map((country) => (
                            <AutocompleteItem key={country.code} textValue={country.code}>
                                <span className="flex items-center gap-2">
                                    <span>{country.flag}</span>
                                    <span>{country.code}</span>
                                </span>
                            </AutocompleteItem>
                        ))}
                    </Autocomplete>
                    <Input
                        required
                        className="flex-1 border-gray-300 text-black"
                        defaultValue={props.userData?.info?.phoneNumber}
                        id="phone-number"
                        name="phoneNumber"
                        placeholder="724-848-1225"
                        type="tel"
                    />
                </div>
            </div>
            <div className="space-y-2 w-full">
                <LabelTag id="password" title="Current Password"/>
                <div className="flex gap-2">
                    <Input
                        isRequired
                        id="password"
                        name="password"
                        placeholder="********"
                        type="password"
                    />
                </div>
            </div>
            <div className="space-y-2 w-full">
                <LabelTag id="newPassword" title="New Password"/>
                <div className="flex gap-2">
                    <Input
                        isRequired
                        id="newPassword"
                        name="newPassword"
                        placeholder="********"
                        type="password"
                    />
                </div>
            </div>
            <div className="space-y-2 w-full">
                <LabelTag id="confirmPassword" title="Confirm Password"/>
                <div className="flex gap-2">
                    <Input
                        isRequired
                        id="confirmPassword"
                        name="confirmPassword"
                        placeholder="********"
                        type="password"
                    />
                </div>
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
                    className="border-1 border-[var(--chart-green)] text-[var(--text-green)]"
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
