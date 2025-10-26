import React from 'react';

interface Props { activeFilter: string; setActiveFilter: (filter: string) => void; }
const FILTERS = ['All', 'New Listing'];

export const FilterChips: React.FC<Props> = ({ activeFilter, setActiveFilter }) => (
    <div className="flex items-center space-x-2 py-4 px-2">
        {FILTERS.map(filter => (
            <button key={filter} className={`px-3 py-1 text-xs rounded-md transition-colors duration-200 ${activeFilter === filter ? 'bg-white text-black' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                    onClick={() => setActiveFilter(filter)}>
                {filter}
            </button>
        ))}
    </div>
);
