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

interface ProfileSetupFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
}

const ProfileSetupForm = ({ onSubmit, onBack }: ProfileSetupFormProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = React.useState<DateValue | null>(parseDate("2024-03-07"));
  const [gender, setGender] = React.useState<React.Key>("male");
  const [phoneCountry, setPhoneCountry] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      firstName,
      lastName,
      birthday,
      gender,
      phoneCountry,
      phoneNumber
    });
  };

  const countryCodes = [
    { code: '+1', country: 'US', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+49', country: 'DE', flag: '🇩🇪' },
    { code: '+33', country: 'FR', flag: '🇫🇷' },
    { code: '+39', country: 'IT', flag: '🇮🇹' },
    { code: '+34', country: 'ES', flag: '🇪🇸' },
    { code: '+81', country: 'JP', flag: '🇯🇵' },
    { code: '+86', country: 'CN', flag: '🇨🇳' },
    { code: '+91', country: 'IN', flag: '🇮🇳' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="firstName" className="text-white text-sm">First Name</label>
        <Input
          id="firstName"
          type="text"
          placeholder="Enter your First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="border-gray-300 text-black placeholder:text-gray-500"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="lastName" className="text-white text-sm">Last Name</label>
        <Input
          id="lastName"
          type="text"
          size="md"
          placeholder="Enter your Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="border-gray-300 text-black placeholder:text-gray-500"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="birthday" className="text-white text-sm">Birthday</label>
        <DatePicker
          id="birthday"
          labelPlacement="outside"
          showMonthAndYearPickers
          minValue={parseDate("1900-01-01")}
          maxValue={today(getLocalTimeZone())}
          size="md"
          className="pointer-events-auto"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="gender" className="text-white text-sm">Gender</label>
        <Autocomplete id="gender" className="w-full" placeholder="Select your gender" labelPlacement="outside" size="md" onSelectionChange={(k: Key | null) => setGender(k as string)}>
          <AutocompleteItem key="male">Male</AutocompleteItem>
          <AutocompleteItem key="female">Female</AutocompleteItem>
          <AutocompleteItem key="other">Other</AutocompleteItem>
          <AutocompleteItem key="prefer-not-to-say">Prefer not to say</AutocompleteItem>
        </Autocomplete>
      </div>

      <div className="space-y-2">
        <label className="text-white text-sm">Phone Number</label>
        <div className="flex gap-2">
          <Autocomplete
            isRequired
            items={countryCodes}
            errorMessage={!phoneCountry ? "" : "Country code is required"}
            className="w-[90px]"
            isClearable={false}
            onSelectionChange={(k: Key | null) => setPhoneCountry(k as string)}
          >
            {countryCodes.map((country) => (
              <AutocompleteItem key={country.code} textValue={country.code}>
                  <span className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{country.code}</span>
                  </span>
              </AutocompleteItem>
            ))}
          </Autocomplete>
          <Input
            type="tel"
            placeholder="724-848-1225"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="flex-1 border-gray-300 text-black placeholder:text-gray-500"
            required
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black transition-colors"
      >
        Next
      </Button>
    </form>
  );
};

export default ProfileSetupForm;
