import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format, startOfMonth, getDaysInMonth, getDay, addMonths, subMonths, isSameDay } from "date-fns";

interface DateInputProps {
    label: string;
    selected: Date | null;
    setSelected: (date: Date) => void;
}

const DateInputCalendar: React.FC<DateInputProps> = ({ label, selected, setSelected }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(selected || new Date());
    const dropdownRef = useRef<HTMLDivElement>(null);

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if(selected){
            setCurrentMonth(selected)
        }
    }, [selected])

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-4">
                <button
                    className="p-1 rounded-full hover:bg-gray-700 transition-colors"
                    type="button"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                </button>
                <div className="text-lg font-semibold">
                    {format(currentMonth, "MMMM yyyy")}
                </div>
                <button
                    className="p-1 rounded-full hover:bg-gray-700 transition-colors"
                    type="button"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                </button>
            </div>
        );
    };

    const renderDays = () => {
        return (
            <div className="grid grid-cols-7 text-center text-sm text-gray-400 mb-2">
                {daysOfWeek.map((day) => (
                    <div key={day} className="font-medium">{day}</div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const daysInMonth = getDaysInMonth(currentMonth);
        const startingDay = getDay(monthStart);

        const blanks = Array(startingDay).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const handleDateClick = (day: number) => {
            const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

            setSelected(newDate);
            setIsOpen(false);
        };

        return (
            <div className="grid grid-cols-7 text-center text-sm">
                {blanks.map((_, index) => (
                    <div key={`blank-${index}`} className="p-1" />
                ))}
                {days.map((day) => {
                    const fullDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const isSelected = selected && isSameDay(fullDate, selected);
                    const isToday = isSameDay(fullDate, new Date());

                    return (
                        <div key={day} className="p-1">
                            <button
                                className={`w-8 h-8 rounded-full transition-colors ${
                                    isSelected
                                        ? "bg-blue-500 text-white"
                                        : isToday
                                            ? "bg-gray-700"
                                            : "hover:bg-gray-700"
                                }`}
                                type="button"
                                onClick={() => handleDateClick(day)}
                            >
                                {day}
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div ref={dropdownRef} className="relative w-full">
            <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>

            <button
                className="w-full bg-dark-semi-black border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none flex items-center justify-between"
                type="button"
                onClick={() => setIsOpen((o) => !o)}
            >
                <span className={selected ? "text-white" : "text-gray-400"}>
                    {selected ? format(selected, "MM/dd/yyyy") : "Select a date"}
                </span>

                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full left-0 right-0 z-50 mt-1 bg-dark-semi-black border border-white/10 rounded-md shadow-lg p-4"
                        exit={{ opacity: 0, y: -10 }}
                        initial={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderHeader()}
                        {renderDays()}
                        {renderCells()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DateInputCalendar;
