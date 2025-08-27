import React from "react";

const Slider: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    colorClass?: string;
}> = ({ label, value, onChange, colorClass = 'text-gray-400' }) => {
    const percentage = ((value - 1) / 99) * 100;
    const steps = [1, 25, 50, 75, 100];
    const inputValue = value === 1 ? 0 : value;
    const [labelPart1, labelPart2] = label.split(' ');

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sliderValue = parseInt(e.target.value, 10);

        onChange(sliderValue === 0 ? 1 : sliderValue);
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-300">{labelPart1} <span className={colorClass}>{labelPart2}</span></label>
                <span className={`text-sm font-medium ${colorClass}`}>{value}x</span>
            </div>
            <div className="relative group py-2">
                <div className="relative h-2 flex items-center mx-2">
                    <div className="absolute w-full h-1 bg-gray-700 rounded-full" />
                    <div className="absolute h-1 bg-white rounded-full" style={{ width: `${percentage}%` }} />
                    {steps.map(step => {
                        const stepPercentage = ((step - 1) / 99) * 100;

                        return (<div key={step} className={`absolute h-2 w-2 rounded-full transition-colors ${value >= step ? 'bg-white' : 'bg-gray-500'}`} style={{ left: `${stepPercentage}%`, transform: 'translateX(-50%)' }} />);
                    })}
                    <div className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-md pointer-events-none transition-transform group-hover:scale-110" style={{ left: `${percentage}%`, transform: 'translateY(-50%) translateX(-50%)' }} />
                </div>
                <input className="w-full h-4 opacity-0 cursor-pointer absolute top-0 left-0" max="100" min="0" step="5" type="range" value={inputValue} onChange={handleSliderChange} />
            </div>
        </div>
    );
};

export default Slider;
