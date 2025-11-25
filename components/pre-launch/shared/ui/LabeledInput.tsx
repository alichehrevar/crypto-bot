import React, { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

// 1. Define a union type that covers both Input and Textarea attributes
type BaseProps = {
    id: string;
    title: string;
    error?: string; // Added logic to display error messages
    type?: string;
} & (
    | InputHTMLAttributes<HTMLInputElement>
    | TextareaHTMLAttributes<HTMLTextAreaElement>
    );

// 2. Wrap in forwardRef
const LabeledInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, BaseProps>(
    ({ id, title, name, placeholder, type = 'text', error, className, ...props }, ref) => {

        // Shared classes for both inputs
        const baseStyles = `
            bg-[#F2F3F7CC] rounded-lg 
            focus:outline-none focus:ring-1 focus:ring-[#757575] 
            text-sm w-full transition-all duration-150 ease-in-out text-[#030303]
            ${error ? 'border-1 border-[#F03738] focus:ring-[#F03738]' : ''}
        `;

        return (
            <div className="flex items-start justify-center flex-col gap-2 w-full">
                <label className="text-[#030303] font-semibold" htmlFor={id}>
                    {title}
                    <small className="text-red-600 ms-1">*</small>
                </label>

                {type === 'textarea' ? (
                    <textarea
                        // Cast ref to specific element type
                        ref={ref as React.Ref<HTMLTextAreaElement>}
                        className={`${baseStyles} p-3`}
                        id={id}
                        name={name}
                        placeholder={placeholder}
                        rows={6}
                        // Spread the rest (onChange, onBlur, value, etc. come from RHF)
                        {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
                    />
                ) : (
                    <input
                        ref={ref as React.Ref<HTMLInputElement>}
                        className={`${baseStyles} h-[48px] px-3`}
                        id={id}
                        name={name}
                        placeholder={placeholder}
                        type={type}
                        {...(props as InputHTMLAttributes<HTMLInputElement>)}
                    />
                )}

                {/* 3. Display Error Message if present */}
                {error && (
                    <span className="text-xs text-[#F03738] ms-1 -mt-1">{error}</span>
                )}
            </div>
        );
    }
);

LabeledInput.displayName = "LabeledInput";

export default LabeledInput;
