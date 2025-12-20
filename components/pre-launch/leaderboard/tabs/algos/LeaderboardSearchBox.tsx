'use client'

import React, {useState} from "react";
import {SearchIcon, XIcon} from "lucide-react";

interface SearchBoxProps {
    placeholder?: string;
}

const LeaderboardSearchBox: React.FC<SearchBoxProps> = ({
     placeholder = "Search trader"
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    /**
     * Updates the search term state as the user types.
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    return (
        <div className="flex w-52.5 h-10">
            <div className="relative flex items-center w-full bg-[#1F2021] rounded-xl transition-all duration-300 ease-in-out ring-1 ring-transparent focus-within:ring-[#B9F641]">

                {/* Search Icon */}
                <div className="pl-3 pr-2 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none">
                    <SearchIcon className="text-neutral-500 h-5 w-5" />
                </div>

                {/* Input Field */}
                <input
                    className="grow w-full bg-transparent border-none outline-none h-full pl-12 pr-12 text-white placeholder:text-neutral-500 text-base"
                    placeholder={placeholder}
                    type="text"
                    value={searchTerm}
                    onChange={handleChange}
                />

                {/* Clear Button */}
                {searchTerm && (
                    <div className="pr-5 pl-2 absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
                        <button
                            aria-label="Clear search text"
                            className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                            onClick={() => setSearchTerm('')}
                        >
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaderboardSearchBox;
