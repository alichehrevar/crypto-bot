import React from "react";

const CardWrapper = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-5 ${className}`}>
        {children}
    </div>
);

export default CardWrapper;
