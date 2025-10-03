import React from "react";

interface InputProps {
    id: string;
    title: string;
    placeholder?: string;
    type?: string;
    onChange?: (value: string) => void;
}

export default function Input({ id, title, placeholder, type = 'text', onChange }: InputProps) {

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (onChange) {
            onChange(event.target.value);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor={id}>
                {title}
            </label>
            <input
                className="w-full bg-dark-semi-black border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-600 focus:outline-none"
                id={id}
                placeholder={placeholder}
                type={type}
                onChange={handleChange}
            />
        </div>
    )
}
