import React from 'react';

const CoinSummarySectionLoading: React.FC = () => {
    return (
        <div className="bg-dark-gray text-white rounded-xl p-4 w-full mx-auto animate-pulse">
            <div className="flex flex-col lg:flex-row justify-between space-y-4 lg:space-y-0">
                {/* Left side placeholder */}
                <div className="lg:w-5/6 space-y-4">
                    <div className="flex flex-col items-start justify-between gap-1">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-4 bg-gray-700 rounded-full" />
                            <div className="h-4 bg-gray-700 rounded-xl w-16" />
                        </div>
                        <div className="h-2 bg-gray-700 rounded-xl w-20" />
                    </div>

                    <div className="flex items-baseline gap-4">
                        <div className="h-8 bg-gray-700 rounded-xl w-24" />
                        <div className="h-6 bg-gray-700 rounded-xl w-16" />
                    </div>

                    <div className="flex gap-4">
                        {Array(4).fill(0).map((_, idx) => (
                            <div key={idx} className="space-x-1 flex">
                                <div className="h-3 bg-gray-700 rounded-xl w-12" />
                                <div className="h-3 bg-gray-600 rounded-xl w-10" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right side placeholder */}
                <div className="flex flex-col justify-end text-xs gap-3 lg:w-1/6">
                    {Array(4).fill(0).map((_, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                            <div className="h-3 bg-gray-700 rounded-xl w-20" />
                            <div className="h-3 bg-gray-600 rounded-xl w-10" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CoinSummarySectionLoading;
