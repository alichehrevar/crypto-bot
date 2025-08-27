import React from "react";

import {RadioOption} from "@/types/ui/RadioOption";

const RadioGroup: React.FC<{
    label: string;
    options: RadioOption[];
    selectedValue: string;
    onChange: (value: string) => void;
}> = ({ label, options, selectedValue, onChange }) => (
    <fieldset>
        <legend className="block text-sm font-medium text-gray-300 mb-2">{label}</legend>
        <div className="flex items-center gap-4 flex-wrap">
            {options.map(({ value, label: optionLabel }) => (
                <label key={value} className="flex items-center cursor-pointer text-sm text-gray-300">
                    <input checked={selectedValue === value} className="sr-only peer" name={label} type="radio" value={value} onChange={() => onChange(value)} />
                    <span className="w-4 h-4 rounded-full border-2 border-gray-500 mr-2 flex items-center justify-center peer-checked:border-blue-600 transition-colors">
                       <span className="w-2 h-2 rounded-full bg-blue-600 scale-0 peer-checked:scale-100 transition-transform" />
                    </span>
                    {optionLabel}
                </label>
            ))}
        </div>
    </fieldset>
);

export default RadioGroup;
