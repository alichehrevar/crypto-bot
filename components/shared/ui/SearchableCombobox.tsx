import React, {useEffect, useRef, useState} from "react";
import Image from "next/image";
import {AnimatePresence, motion} from "framer-motion";

import {DropdownOption} from "@/types/ui/DropdownOption";

const StyledCombobox: React.FC<{
    id: string;
    label: string;
    placeholder: string;
    options: DropdownOption[];
    selected: string;
    setSelected: (value: string) => void;
}> = ({ id, label, placeholder, options, selected, setSelected }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const comboboxRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.name === selected);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = query === ''
        ? options
        : options.filter(option => option.name.toLowerCase().includes(query.toLowerCase()));

    const displayValue = isOpen ? query : selected;

    return (
        <div ref={comboboxRef} className="relative w-full">
            <label className="block text-sm font-medium text-gray-400 mb-2" htmlFor={id}>{label}</label>
            <div className="relative">
                {selectedOption && !isOpen &&
                    <Image alt={`${selectedOption.name} logo`} className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" height={20} src={selectedOption.logo} width={20} />
                }
                <input
                    className={`w-full bg-dark-semi-black border border-gray-600 text-white rounded-md py-2 text-sm focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none ${selectedOption && !isOpen ? 'pl-10 pr-3' : 'px-3'}`}
                    id={id}
                    placeholder={placeholder}
                    type="text"
                    value={displayValue}
                    onBlur={() => { if (!selected) setQuery(''); }}
                    onChange={(e) => { setQuery(e.target.value); if (!isOpen) setIsOpen(true); }}
                    onFocus={() => { setQuery(''); setIsOpen(true); }}
                />
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        animate={{ opacity: 1, y: 0 }}
                        aria-labelledby={id}
                        className="dropdown-list absolute top-full left-0 right-0 z-50 mt-1 bg-black/30 backdrop-blur-xl border border-white/10 rounded-md shadow-lg max-h-40 overflow-y-auto p-1"
                        exit={{ opacity: 0, y: -10 }}
                        id={`${id}-listbox`}
                        initial={{ opacity: 0, y: -10 }}
                        role="listbox"
                        transition={{ duration: 0.2 }}
                    >
                        {filteredOptions.map((option) => {
                            const isSelected = option.name === selected;

                            return (
                                <li
                                    key={option.name}
                                    aria-selected={isSelected}
                                    className="rounded-sm"
                                    role="option"
                                >
                                    <button
                                        className="w-full px-3 py-1.5 text-sm text-white hover:bg-blue-500/75 rounded-sm transition-colors duration-150 flex items-center text-left"
                                        type="button"
                                        onClick={() => {
                                            setSelected(option.name);
                                            setIsOpen(false);
                                            setQuery(option.name);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setSelected(option.name);
                                                setIsOpen(false);
                                                setQuery(option.name);
                                            }
                                        }}
                                    >
                                        <Image
                                            alt={`${option.name} logo`}
                                            className="w-5 h-5 mr-3 object-contain"
                                            height={20}
                                            src={option.logo}
                                            width={20}
                                        />
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

export default StyledCombobox;
