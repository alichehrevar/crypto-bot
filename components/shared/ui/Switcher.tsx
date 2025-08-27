import React from "react";
import {motion} from "framer-motion";

const Switch: React.FC<{ selected: boolean; onChange: () => void }> = ({selected, onChange}) => (
    <button
        aria-label="Toggle"
        className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${selected ? 'bg-green-500' : 'bg-gray-600'}`}
        type="button"
        onClick={onChange}
    >
        <motion.span
            layout
            animate={{x: selected ? 20 : 0}}
            className="inline-block h-5 w-5 transform rounded-full bg-white shadow"
            transition={{type: "spring", stiffness: 700, damping: 30}}
        />
    </button>
);

const Switcher: React.FC<{ title: string; isEnabled: boolean; setIsEnabled: (value: boolean) => void }> = ({
    title,
    isEnabled,
    setIsEnabled
}) => (
    <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-200">{title}</h3>
        <Switch selected={isEnabled} onChange={() => setIsEnabled(!isEnabled)}/>
    </div>
);

export default Switcher;
