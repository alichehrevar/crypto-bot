import React from 'react';

const AccountDetailsLoading: React.FC = () => {
    return (
        <div className="animate-pulse w-full flex flex-col gap-10 mb-2.5">
            {/* Top section: Avatar, User Info, and Edit Button */}
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center justify-center gap-8">
                    {/* Avatar Placeholder */}
                    <div className="w-[60px] h-[60px] bg-gray-700 rounded-full" />

                    {/* User Info Placeholders */}
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-start justify-center text-[13px] gap-4">
                            <div className="h-4 bg-gray-700 rounded-xl w-16" />
                            <div className="h-4 bg-gray-700 rounded-xl w-12" />
                        </div>
                        <div className="flex flex-col items-start justify-center text-[13px] gap-4">
                            <div className="h-4 bg-gray-700 rounded-xl w-28" />
                            <div className="h-4 bg-gray-700 rounded-xl w-20" />
                        </div>
                    </div>
                </div>

                {/* Edit Button Placeholder */}
                <div className="h-10 bg-gray-700 rounded-lg w-20" />
            </div>

            {/* Bottom section: Account Details */}
            <div className="flex items-start justify-center flex-col gap-4 mt-6">
                {/* Title Placeholder */}
                <div className="h-6 bg-gray-700 rounded-xl w-48" />

                {/* List Placeholders */}
                <ul className="flex items-start justify-center flex-col gap-4 text-[13px] mt-4 w-full">
                    {/* Email Address */}
                    <li className="flex items-center justify-start w-full gap-4">
                        <div className="h-4 bg-gray-700 rounded-xl w-[200px]" />
                        <div className="h-4 bg-gray-700 rounded-xl w-56" />
                    </li>
                    {/* Phone Number */}
                    <li className="flex items-center justify-start w-full gap-4">
                        <div className="h-4 bg-gray-700 rounded-xl w-[200px]" />
                        <div className="h-4 bg-gray-700 rounded-xl w-32" />
                    </li>
                    {/* Country/Region */}
                    <li className="flex items-center justify-start w-full gap-4">
                        <div className="h-4 bg-gray-700 rounded-xl w-[200px]" />
                        <div className="h-4 bg-gray-700 rounded-xl w-24" />
                    </li>
                    {/* Connected Accounts */}
                    <li className="flex items-center justify-start w-full gap-4">
                        <div className="h-4 bg-gray-700 rounded-xl w-[200px]" />
                        <div className="w-[32px] h-[32px] bg-gray-700 rounded-full" />
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default AccountDetailsLoading;
