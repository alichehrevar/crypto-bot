import React from 'react';

export const SkeletonRow: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
    <div className="flex items-center px-4 py-3 border-b border-zinc-800" style={style}>
        <div className="w-4 h-4 bg-zinc-700 rounded-full mr-3 animate-pulse" />
        <div className="flex-1">
            <div className="flex items-center space-x-2"><div className="w-20 h-4 bg-zinc-700 rounded animate-pulse" /><div className="w-4 h-4 bg-zinc-700 rounded-full animate-pulse" /></div>
            <div className="w-16 h-3 bg-zinc-700 rounded mt-2 animate-pulse" />
        </div>
        <div className="text-right">
            <div className="w-24 h-4 bg-zinc-700 rounded animate-pulse" />
            <div className="w-12 h-3 bg-zinc-700 rounded mt-2 ml-auto animate-pulse" />
        </div>
    </div>
);
