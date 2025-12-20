'use client'

import React, { useState, useEffect, useRef } from 'react';
import Link from "next/link";
// 1. Import motion and AnimatePresence
import { motion, AnimatePresence } from 'framer-motion';

// Interface for the component props
interface DarkSelectProps {
    title?: string; // Optional title for the mobile modal
    daysOptions: string[]
}

// SVG Chevron Icon
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg
        aria-hidden="true"
        className={className}
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            clipRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.23 8.29a.75.75 0 01.02-1.06z"
            fillRule="evenodd"
        />
    </svg>
);

// The Select Component
const DarkSelect: React.FC<DarkSelectProps> = ({title = "Sort by", daysOptions}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState(daysOptions[0]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle clicks outside the dropdown to close it (for desktop)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleOptionClick = (option: string) => {
        setSelectedOption(option);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative inline-block text-left">
            {/* --- Select Trigger Button --- */}
            <div>
                <button
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    className="inline-flex w-[100px] text-nowrap justify-between items-center gap-x-1.5 rounded-xl  px-4 h-[40px] text-sm font-semibold text-gray-300 shadow-sm ring-1 ring-inset ring-[#606060] "
                    id="options-menu"
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {selectedOption}
                    {/* 2. Animate the chevron icon */}
                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        className="ml-1 -mr-1"
                        style={{ display: 'inline-block' }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDownIcon className="size-5 text-gray-400" />
                    </motion.div>
                </button>
            </div>

            {/* 3. Wrap all conditional elements in AnimatePresence */}
            <AnimatePresence>
                {/* --- Desktop Dropdown Menu --- */}
                {isOpen && (
                    <motion.div
                        // 4. Add enter/exit animations for desktop
                        key="desktop-dropdown"
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        aria-labelledby="options-menu"
                        aria-orientation="vertical"
                        className="hidden md:block absolute left-0 z-10 mt-1 w-48 origin-top-right rounded-xl bg-[#030303] border-1.5 border-[#262626] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"

                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        role="menu"
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                        <div className="py-2 px-2" role="none">
                            {daysOptions.map((option, index) => (
                                <Link
                                    key={index}
                                    className={`block rounded-lg px-4 py-2.5 text-sm ${option === selectedOption
                                        ? 'bg-[#F2F3F733] text-white'
                                        : 'text-gray-300 hover:bg-[#F2F3F713] hover:text-white'
                                    }`}
                                    href="#"
                                    role="menuitem"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleOptionClick(option);
                                    }}
                                >
                                    {option}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* --- Mobile Bottom Sheet Modal --- */}
                {isOpen && (
                    <div
                        key="mobile-sheet"
                        aria-modal="true"
                        className="fixed inset-0 z-10 md:hidden"
                        role="dialog"
                    >
                        {/* Backdrop */}
                        <motion.div
                            // 5. Animate the backdrop
                            animate={{ opacity: 1 }}
                            aria-hidden="true"
                            className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
                            exit={{ opacity: 0 }}

                            initial={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            onClick={() => setIsOpen(false)} // Close modal on backdrop click
                        />

                        {/* Bottom Sheet Panel */}
                        <motion.div
                            // 6. Animate the panel sliding up
                            animate={{ y: 0 }}
                            className="fixed bottom-0 left-0 right-0 z-10 w-full"
                            exit={{ y: "100%" }}
                            initial={{ y: "100%" }}

                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        >
                            <div className="bg-[#1d1d1d] rounded-t-xl pb-6">
                                <div className="pt-4 px-4">
                                    {/* Drag Handle */}
                                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-600 mb-3" />

                                    {/* Title */}
                                    <h2 className="text-center text-sm font-semibold text-gray-400 mb-4">
                                        {title}
                                    </h2>

                                    {/* Options List */}
                                    <div className="flex flex-col gap-2" role="none">
                                        {daysOptions.map((option, index) => (
                                            <Link
                                                key={index}
                                                className={`block rounded-lg px-4 py-3.5 text-base ${option === selectedOption
                                                    ? 'bg-[#333333] text-white'
                                                    : 'text-gray-300'
                                                }`}
                                                href="#"
                                                role="menuitem"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleOptionClick(option);
                                                }}
                                            >
                                                {option}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence> {/* 3. Close AnimatePresence */}
        </div>
    );
};

export default DarkSelect;
