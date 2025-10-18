import React, {useState} from "react";
import {
    Button, DateInput,
} from "@heroui/react";

import {CountryCodes} from "@/utils/countryCodes";
import Input from "@/components/shared/ui/Input";
import Combobox from "@/components/shared/ui/Combobox";

interface ProfileSetupFormProps {
    onSubmit: (data: any) => void;
    onBack: () => void;
}

const ProfileSetupForm = ({onSubmit}: ProfileSetupFormProps) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [birthday, setBirthday] = React.useState<Date | null>(new Date());
    const [phoneCountry, setPhoneCountry] = useState('+1');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [referral, setReferral] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // const formattedBirthday = birthday
        //     ? `${String(birthday.month).padStart(2, '0')}/${String(birthday.day).padStart(2, '0')}/${birthday.year}`
        //     : null;

        onSubmit({
            firstName,
            lastName,
            birthday,
            phoneCountry,
            phoneNumber,
            referral
        });
    };

    return (
        <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
                <Input
                    id="firstName"
                    placeholder="Enter your First Name"
                    title="First Name"
                    type="text"
                    onChange={setFirstName}
                />
            </div>

            <div className="space-y-2">
                <Input
                    id="lastName"
                    placeholder="Enter your Last Name"
                    title="Last Name"
                    type="text"
                    onChange={setLastName}
                />
            </div>

            <div className="space-y-2">
                <DateInput
                    classNames={{
                        label: 'block text-sm font-light text-gray-300',
                        inputWrapper: 'border border-gray-700 hover:border-gray-700 focus-within:border-none focus-within:ring-1 focus-within:ring-blue-600 focus-within:outline-none rounded-md'
                    }}
                    label="Birthday"
                    labelPlacement="outside"
                    variant="bordered"
                    onChange={() => setBirthday}
                />
            </div>

            <div className="space-y-2">
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

            <div className="space-y-2">
                <Input
                    id="ReferralCode"
                    placeholder="(Optional)"
                    title="Referral Code"
                    type="text"
                    onChange={setReferral}
                />
            </div>

            <Button
                className="w-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black transition-colors"
                type="submit"
            >
                Next
            </Button>
        </form>
    );
};

export default ProfileSetupForm;
