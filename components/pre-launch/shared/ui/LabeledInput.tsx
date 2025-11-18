import React from "react";

export default function LabeledInput({
     id,
     title,
     name,
     placeholder,
     type = 'text',
    value,
    onChange
}: {
    id: string,
    title: string,
    name: string,
    placeholder: string,
    type?: string,
    value?: string,
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}) {
    return (
        <div className="flex items-start justify-center flex-col gap-2">
            <label className="text-[#030303] font-semibold" htmlFor={id}>
                {title}
                <small className="text-red-600 ms-1">*</small>
            </label>
            {type === 'textarea'
                ? <textarea
                    className="bg-[#F2F3F7CC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#757575] text-sm w-full p-3 transition-all duration-150 ease-in-out text-[#030303]"
                    defaultValue={value}
                    id={id}
                    name={name}
                    placeholder={placeholder}
                    rows={6}
                    onChange={onChange}
                />
                : <input
                    className="bg-[#F2F3F7CC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#757575] h-[48px] text-sm w-full px-3 transition-all duration-150 ease-in-out text-[#030303]"
                    id={id}
                    name={name}
                    placeholder={placeholder}
                    type={type}
                    value={value}
                    onChange={onChange}
                />
            }
        </div>
    )
}
