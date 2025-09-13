// app/components/crypto-news/NewsFilterBar.tsx

import React, { useState, useRef } from 'react';

import { useClickOutside } from '@/hooks/crypto-news/useClickOutside';

interface NewsFilterBarProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    categories: string[];
}

const NewsFilterBar: React.FC<NewsFilterBarProps> = ({ searchTerm, onSearchChange, onFilterChange, categories }) => {
    const [isFilterDropdownOpen, setFilterDropdownOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    useClickOutside(filterDropdownRef, () => setFilterDropdownOpen(false));

    return (
        <div className="mb-8 flex-shrink-0 w-full flex justify-center">
            <div className="relative w-full sm:w-2/3 lg:w-5/12">
                <input
                    className="w-full p-3 pl-5 pr-24 border-2 border-gray-200 dark:border-gray-700 rounded-full focus:ring-0 focus:border-black dark:focus:border-white transition-all duration-300 bg-white dark:bg-black text-black dark:text-white"
                    placeholder="Search news..."
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 space-x-0.5">
                    <button
                        className="p-2 rounded-full transition-colors text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setFilterDropdownOpen(!isFilterDropdownOpen)}
                    >
                        {/* Filter SVG */}
                    </button>
                    {/* ... Search button and SVG ... */}
                </div>
                {isFilterDropdownOpen && (
                    <div ref={filterDropdownRef} className="absolute mt-2 w-36 bg-white/80 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10 right-0">
                        <ul className="py-1 text-gray-700 dark:text-gray-300">
                            {categories.sort().map(cat => (
                                <li key={cat}>
                                    <button
                                        className="block w-full text-left px-4 py-2 text-sm rounded-md mx-1 my-0.5 hover:bg-blue-500 hover:text-white"
                                        onClick={() => { onFilterChange(cat); setFilterDropdownOpen(false); }}>
                                        {cat}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewsFilterBar;
