import React, { forwardRef, InputHTMLAttributes } from "react";

// 1. We remove 'onChange' from the native types, then re-add it manually
// so we can control exactly what it looks like (standard React event).
interface CustomCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    label?: string;
    onCheckedChange?: (checked: boolean) => void;
    // Fix: Explicitly allow the standard onChange event
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CustomCheckbox = forwardRef<HTMLInputElement, CustomCheckboxProps>(({
  id,
  checked = false,
  onCheckedChange,
  label,
  disabled = false,
  className = '',
  onChange,
  ...props
}, ref) => {

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // 1. Handle our custom boolean logic (for RHF Controller)
        if (onCheckedChange) {
            onCheckedChange(e.target.checked);
        }

        // 2. Handle the standard event (if passed)
        // This line is now valid because we added it to the Interface above
        if (onChange) {
            onChange(e);
        }
    };

    return (
        <label className={`group flex items-center gap-3 cursor-pointer select-none w-fit ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <div className="relative">
                <input
                    ref={ref}
                    checked={checked}
                    className="sr-only"
                    disabled={disabled}
                    id={id}
                    type="checkbox"
                    onChange={handleChange}
                    {...props}
                />

                {/* Visual Representation */}
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

            {label && (
                <span className={`text-zinc-800 font-medium ${checked ? '' : 'text-zinc-600'}`}>
                    {label}
                </span>
            )}
        </label>
    );
});

CustomCheckbox.displayName = "CustomCheckbox";

export default CustomCheckbox;
