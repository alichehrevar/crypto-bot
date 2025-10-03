import React from "react";

const NumericInput: React.FC<{
    label?: string;
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    unit?: string;
    min: number;
    max?: number;
    step?: number;
    usePercentageStep?: boolean;
}> = ({ label, value, onChange, placeholder, unit, min, max, step = 0.1, usePercentageStep = false }) => {

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;

        if (rawValue === '') {
            onChange('');

            return;
        }
        if (!isNaN(parseFloat(rawValue)) || rawValue.endsWith('.') || rawValue.endsWith('0')) {
            onChange(rawValue);
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const numValue = parseFloat(e.target.value);

        if (isNaN(numValue)) {
            onChange(String(min));
        } else {
            const clampedValue = Math.max(min, Math.min(max ?? numValue, numValue));

            onChange(String(clampedValue));
        }
    };

    const adjustValue = (direction: 1 | -1) => {
        const currentValue = parseFloat(String(value)) || min;
        let actualStep;

        if (usePercentageStep) {
            actualStep = currentValue * step;
            actualStep = Math.round(actualStep / 100) * 100;
            actualStep = Math.max(actualStep, 100);
        } else {
            actualStep = step;
        }
        let newValue = currentValue + (actualStep * direction);

        if (max) {
            newValue = Math.max(min, Math.min(max, newValue));
        }
        const decimalPlaces = String(step).includes('.') && !usePercentageStep ? String(step).split('.')[1].length : 0;

        onChange(newValue.toFixed(decimalPlaces));
    };

    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
        e.preventDefault();
        adjustValue(e.deltaY < 0 ? 1 : -1);
    };

    return (
        <div>
            {label && <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>}
            <div className="relative group">
                <input
                    className="w-full bg-dark-semi-black border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-colors duration-200 hide-number-spinners"
                    max={max}
                    min={min}
                    placeholder={placeholder}
                    style={{ paddingRight: unit ? '4.5rem' : '3rem' }}
                    type="number"
                    value={value}
                    onBlur={handleBlur}
                    onChange={handleInputChange}
                    onWheel={handleWheel}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <div className="opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 flex flex-col -space-y-1 pointer-events-auto">
                        <button className="text-white/70 hover:text-white transition-colors h-1/2 flex items-center" type="button" onClick={() => adjustValue(1)}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 8l-6 6h12z" /></svg>
                        </button>
                        <button className="text-white/70 hover:text-white transition-colors h-1/2 flex items-center" type="button" onClick={() => adjustValue(-1)}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 16l6-6H6z" /></svg>
                        </button>
                    </div>
                    {unit && (<span className="ml-2 text-gray-500 text-sm">{unit}</span>)}
                </div>
            </div>
        </div>
    );
};

export default NumericInput;
