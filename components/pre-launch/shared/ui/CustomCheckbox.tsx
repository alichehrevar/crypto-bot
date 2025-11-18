import React from "react";

interface CustomCheckboxProps {
    id: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
}

// --- Component ---

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
   id,
   checked,
   onChange,
   label,
   disabled = false,
   className = '',
}) => {
    return (
        <label className={`group flex items-center gap-3 cursor-pointer select-none w-fit ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <div className="relative">
                {/* Hidden Native Checkbox for Accessibility */}
                <input
                    checked={checked}
                    className="sr-only"
                    disabled={disabled}
                    id={id}
                    type="checkbox"
                    onChange={(e) => onChange(e.target.checked)}
                />

                {/* Custom Checkbox Visual */}
                <div
                    className={`
                        w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 ease-out
                        border-1.5 
                        ${checked
                            ? 'bg-zinc-900 border-zinc-900'
                            : 'bg-transparent border-zinc-800 hover:border-zinc-600'
                        }
                    `}
                >
                    {/* Checkmark Icon */}
                    <svg
                        className={`
                            w-4 h-4 text-white stroke-[4] transition-all duration-200
                            ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
                        `}
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                    >
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
            </div>

            {/* Label Text */}
            {label && (
                <span className={`text-zinc-800 font-medium ${checked ? '' : 'text-zinc-600'}`}>
                    {label}
                </span>
            )}
        </label>
    );
};

export default CustomCheckbox;
