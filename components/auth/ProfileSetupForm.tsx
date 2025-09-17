import React, { Key, useState } from "react";
import {
    Button,
    Input,
    Autocomplete,
    AutocompleteItem,
    DateValue, DateInput
} from "@heroui/react";

import {CountryCodes} from "@/utils/countryCodes";

interface ProfileSetupFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
}

const ProfileSetupForm = ({ onSubmit}: ProfileSetupFormProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = React.useState<DateValue | null>(null);
  const [phoneCountry, setPhoneCountry] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
      const formattedBirthday = birthday
          ? `${String(birthday.month).padStart(2, '0')}/${String(birthday.day).padStart(2, '0')}/${birthday.year}`
          : null;

    onSubmit({
      firstName,
      lastName,
      birthday: formattedBirthday,
      phoneCountry,
      phoneNumber
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-white text-sm" htmlFor="firstName">First Name</label>
        <Input
          required
          className="border-gray-300 text-black placeholder:text-gray-500"
          id="firstName"
          placeholder="Enter your First Name"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-white text-sm" htmlFor="lastName">Last Name</label>
        <Input
          required
          className="border-gray-300 text-black placeholder:text-gray-500"
          id="lastName"
          placeholder="Enter your Last Name"
          size="md"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-white text-sm" htmlFor="birthday">Birthday</label>
        <DateInput
          defaultValue={birthday}
          id="birthday"
          labelPlacement="outside"
          size="md"
          onChange={setBirthday}
        />
      </div>

      <div className="space-y-2">
        <label className="text-white text-sm" htmlFor="phone-number">Phone Number</label>
        <div className="flex gap-2">
          <Autocomplete
            isRequired
            className="w-[90px]"
            errorMessage={!phoneCountry ? "" : "Country code is required"}
            id="phone-number"
            isClearable={false}
            items={CountryCodes}
            name="country-code"
            onSelectionChange={(k: Key | null) => setPhoneCountry(k as string)}
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
            className="flex-1 border-gray-300 text-black placeholder:text-gray-500"
            placeholder="724-848-1225"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
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
