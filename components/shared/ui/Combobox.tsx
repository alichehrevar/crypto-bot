import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

import { DropdownOption } from "@/types/ui/DropdownOption";

const keyOf = (o: DropdownOption) => o.id ?? o.name; // prefer id

const Combobox: React.FC<{
    label: string;
    placeholder?: string;
    options: DropdownOption[];
    selected: string;                 // holds id or name
    setSelected: (value: string) => void; // will receive id if exists, else name
}> = ({ label, placeholder, options, selected, setSelected }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => keyOf(opt) === selected);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative w-full">
            <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>

            <button
                className="w-full bg-dark-semi-black border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none flex items-center justify-between"
                type="button"
                onClick={() => setIsOpen((o) => !o)}
            >
                <div className="flex items-center">
                    {selectedOption?.logo && (
                        <Image
                            alt={`${selectedOption.name} logo`}
                            className="w-5 h-5 mr-3 object-contain"
                            height={20}
                            src={selectedOption.logo}
                            width={20}
                        />
                    )}
                    <span className={`capitalize ${selected ? "text-white" : "text-gray-400"}`}>
                        {selectedOption?.name ?? placeholder}
                    </span>
                </div>

                <svg
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        animate={{ opacity: 1, y: 0 }}
                        aria-label={label}
                        className="absolute top-full left-0 right-0 z-50 mt-1 bg-black/30 backdrop-blur-xl border border-white/10 rounded-md shadow-lg max-h-40 overflow-y-auto p-1"
                        exit={{ opacity: 0, y: -10 }}
                        initial={{ opacity: 0, y: -10 }}
                        role="listbox"
                        transition={{ duration: 0.2 }}
                    >
                        {options.map((option) => {
                            const value = keyOf(option);
                            const isSelected = value === selected;

                            const handleSelect = () => {
                                setSelected(value); // pass id if exists, else name
                                setIsOpen(false);
                            };

                            if (option.name === '') return (<hr key={value} className="my-1 border-gray-600 mx-2" />);

                            return (
                                <li key={value} className="rounded-sm" role="presentation">
                                    <button
                                        aria-selected={isSelected}
                                        className="w-full px-3 py-1.5 capitalize text-sm text-white hover:bg-blue-500/75 rounded-sm transition-colors duration-150 flex items-center text-left"
                                        role="option"
                                        type="button"
                                        onClick={handleSelect}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                handleSelect();
                                            }
                                        }}
                                    >
                                        {option.logo && (
                                            <Image
                                                alt={`${option.name} logo`}
                                                className="w-5 h-5 mr-3 object-contain"
                                                height={20}
                                                src={option.logo}
                                                width={20}
                                            />
                                        )}
                                        {option.name}
                                    </button>
                                </li>
                            );
                        })}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Combobox;
