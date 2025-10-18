import React from 'react';

// Define the props interface
interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string; // To display a validation error
    wrapperClassName?: string;
}

const DateInput: React.FC<DateInputProps> = ({
                                                 label,
                                                 id,
                                                 name,
                                                 error,
                                                 className,
                                                 wrapperClassName,
                                                 ...rest // Pass down other props like value, onChange, onBlur
                                             }) => {

    // Base input classes
    const baseInputClasses = `
    bg-gray-50 border text-gray-900 text-sm rounded-lg
    block w-full p-2.5
    dark:bg-gray-700 dark:text-white
    dark:placeholder-gray-400
  `;

    // Conditional classes for validation state
    const stateClasses = error
        ? 'border-red-500 text-red-900 placeholder-red-700 focus:border-red-500 focus:ring-red-500 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500'
        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:focus:ring-blue-500 dark:focus:border-blue-500';

    return (
        <div className={wrapperClassName}>
            <label
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                htmlFor={id || name}
            >
                {label}
            </label>
            <input
                className={`${baseInputClasses} ${stateClasses} ${className || ''}`}
                id={id || name}
                maxLength={10} // Still good to keep
                name={name}
                placeholder="dd/mm/yyyy"
                type="text" // Keep as text for custom formatting
                {...rest}
            />
            {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
};

export default DateInput;
