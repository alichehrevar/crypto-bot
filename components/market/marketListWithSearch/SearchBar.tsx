import React from 'react';

import {SearchIcon} from "@/utils/icons";

interface Props { searchQuery: string; setSearchQuery: (query: string) => void; }

export const SearchBar: React.FC<Props> = ({ searchQuery, setSearchQuery }) => (
    <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
            className="w-full bg-dark-semi-black border border-gray-600 rounded-lg pl-10 pr-4 py-1.5 text-zinc-200 placeholder-zinc-500 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-colors duration-200 text-[14px]"
            placeholder="Search..." type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
    </div>
);
