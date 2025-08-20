import React, { Key, useState } from "react";
import {
  Button,
  Input,
  Autocomplete,
  AutocompleteItem,
  DateValue,
  DatePicker
} from "@heroui/react";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { useDateFormatter } from "@react-aria/i18n";

import {CountryCodes} from "@/utils/countryCodes";

interface ProfileSetupFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
}

const ProfileSetupForm = ({ onSubmit}: ProfileSetupFormProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = React.useState<DateValue | null>(parseDate("2024-03-07"));
  const [gender, setGender] = React.useState<React.Key>("male");
  const [phoneCountry, setPhoneCountry] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');

  let formatter = useDateFormatter({dateStyle: "full"});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      firstName,
      lastName,
      birthday: birthday ? formatter.format(birthday.toDate(getLocalTimeZone())) : null,
      gender,
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
        <DatePicker
          showMonthAndYearPickers
          className="pointer-events-auto"
          id="birthday"
          labelPlacement="outside"
          maxValue={today(getLocalTimeZone())}
          minValue={parseDate("1900-01-01")}
          size="md"
          value={birthday}
          onChange={setBirthday}
        />
      </div>

      <div className="space-y-2">
        <label className="text-white text-sm" htmlFor="gender">Gender</label>
        <Autocomplete className="w-full" id="gender" labelPlacement="outside" placeholder="Select your gender" size="md" onSelectionChange={(k: Key | null) => setGender(k as string)}>
          <AutocompleteItem key="male">Male</AutocompleteItem>
          <AutocompleteItem key="female">Female</AutocompleteItem>
          <AutocompleteItem key="other">Other</AutocompleteItem>
          <AutocompleteItem key="prefer-not-to-say">Prefer not to say</AutocompleteItem>
        </Autocomplete>
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
