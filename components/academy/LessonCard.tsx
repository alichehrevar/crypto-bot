'use client';

import React from 'react';

import {topicIcons} from "@/utils/TopicIcons";
import {SignalEnginesIllustration, WelcomeIllustrationIcon} from "@/utils/icons";

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================
export interface Lesson {
    title: string;
    duration: string;
    description?: string;
    iconId: keyof typeof topicIcons;
}


// =====================================================================
// --- SVG ICONS & ILLUSTRATIONS ---
// =====================================================================

const CurvyPlayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.24,5.5C8.13,4.8,6.5,5.54,6.5,6.85v10.3c0,1.31,1.63,2.05,2.74,1.35l8.6-5.15c1.1-0.66,1.1-2.22,0-2.88L9.24,5.5z" />
    </svg>
);

// --- Lesson Card Component ---
const LessonCard: React.FC<{
    lesson: Lesson,
    section: 'get-started' | 'advanced'
}> = ({
    lesson,
    section
}) => {

    const IllustrationComponent = topicIcons[lesson.iconId] || (section === 'advanced' ? SignalEnginesIllustration : WelcomeIllustrationIcon);

    return (
        <div className="w-72 rounded-xl overflow-hidden bg-dark-gray border border-[#333333] hover:border-[#9EF01A]/50 transition-colors duration-300 group cursor-pointer flex-shrink-0">
            <div className="relative h-40 w-full">
                <IllustrationComponent />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-100 ease-out scale-75 group-hover:scale-100">
                    <div className="w-16 h-16 rounded-full bg-gray-500/60 backdrop-blur-md border border-white/20 flex items-center justify-center">
                        <CurvyPlayIcon className="w-10 h-10 text-white/90" />
                    </div>
                </div>
            </div>
            <div className="p-4 group-hover:bg-dark-gray transition-colors duration-300">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="text-white font-medium truncate" title={lesson.title}>{lesson.title}</h4>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{lesson.duration}</span>
                </div>
                {lesson.description && <p className="text-gray-400 text-xs line-clamp-2 h-8">{lesson.description}</p>}
            </div>
        </div>
    );
};

export default LessonCard;
