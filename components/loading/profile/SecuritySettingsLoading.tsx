import React from 'react';

const SecuritySettingsLoading: React.FC = () => {
    return (
        <div className="flex items-start justify-center flex-col w-full gap-4 animate-pulse">
            {/* Header Placeholder */}
            <div className="flex items-center justify-between w-full">
                {/* "Security" Title Placeholder */}
                <div className="h-6 bg-gray-700 rounded-xl w-32" />

                {/* "Edit" Button Placeholder */}
                <div className="h-10 bg-gray-700 rounded-lg w-20" />
            </div>

            {/* List Placeholders */}
            <ul className="flex items-start justify-center flex-col gap-4 text-[13px] mt-4 w-full">
                {/* Password line */}
                <li className="flex items-center justify-start w-full gap-4">
                    <div className="h-4 bg-gray-700 rounded-xl w-[200px]" />
                    <div className="h-4 bg-gray-700 rounded-xl w-28" />
                </li>
                {/* Phone Verification line */}
                <li className="flex items-center justify-start w-full gap-4">
                    <div className="h-4 bg-gray-700 rounded-xl w-[200px]" />
                    <div className="h-4 bg-gray-700 rounded-xl w-36" />
                </li>
            </ul>
        </div>
    );
};

export default SecuritySettingsLoading;
