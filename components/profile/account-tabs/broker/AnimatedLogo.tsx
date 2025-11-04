'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedLogoProps {
    rotation: number;
    accentColor: string;
}

const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ rotation, accentColor }) => {
    const sizeClasses = "w-[1000px] h-[1000px]";

    return (
        <motion.svg
            animate={{ rotate: rotation, color: accentColor }}
            className={sizeClasses}
            transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1] }}
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g opacity="0.4" stroke="currentColor" strokeWidth="1.2">
                <line x1="50" x2="28" y1="50" y2="28" />
                <line x1="50" x2="72" y1="50" y2="28" />
                <line x1="50" x2="72" y1="50" y2="72" />
                <line x1="50" x2="32" y1="50" y2="68" />
            </g>
            <g fill="currentColor" opacity="1">
                <circle cx="50" cy="50" r="10" />
                <circle cx="28" cy="28" r="6" />
                <circle cx="72" cy="28" r="6" />
                <circle cx="72" cy="72" r="6" />
                <circle cx="32" cy="68" r="5" />
            </g>
        </motion.svg>
    );
};

export default AnimatedLogo;
