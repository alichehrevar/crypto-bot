import React from "react";

const StatRow = ({ label, value, isGreen = false }: { label: string; value: string; isGreen?: boolean }) => (
    <div className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
        <span className="text-zinc-400 text-sm font-medium">{label}</span>
        <span className={`text-sm font-bold ${isGreen ? 'text-emerald-400' : 'text-white'}`}>
            {value}
        </span>
    </div>
);

export default StatRow;
