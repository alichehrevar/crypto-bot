import React from 'react';

const CoinSummarySectionLoading: React.FC = () => {
    return (
        <div className="text-white rounded-xl px-4 pb-6 pt-2 w-full mx-auto animate-pulse">
            <div className="flex flex-col lg:flex-row justify-between">
                {/* Left Side Placeholder */}
                <div className="lg:w-4/6 space-y-2">
                    {/* Header Placeholder */}
                    <div className="flex flex-col items-start justify-between">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-6 h-6 bg-gray-700 rounded-full" />
                            <div className="h-4 bg-gray-700 rounded-xl w-32" />
                        </div>
                        <div className="h-3 bg-gray-700 rounded-xl mt-1.5 w-48" />
                    </div>

                    {/* Price & 24h Change Placeholder */}
                    <div className="flex items-baseline gap-4 mb-3 pt-2">
                        <div className="h-10 bg-gray-700 rounded-xl w-40" />
                        <div className="h-6 bg-gray-700 rounded-xl w-20" />
                    </div>

                    {/* Stats Grid Placeholder */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                        {/* High (24h) */}
                        <div className="flex items-center gap-1.5">
                            <div className="h-3 bg-gray-700 rounded-xl w-14" />
                            <div className="h-2 bg-gray-600 rounded-xl w-16" />
                        </div>
                        {/* Low (24h) */}
                        <div className="flex items-center gap-1.5">
                            <div className="h-3 bg-gray-700 rounded-xl w-12" />
                            <div className="h-2 bg-gray-600 rounded-xl w-16" />
                        </div>
                        {/* All-Time High */}
                        <div className="flex items-center gap-1.5">
                            <div className="h-3 bg-gray-700 rounded-xl w-20" />
                            <div className="h-2 bg-gray-600 rounded-xl w-16" />
                        </div>
                    </div>
                </div>

                {/* Right Side Placeholder */}
                <div className="flex flex-col justify-end text-xs gap-3 lg:w-2/6 mt-4 lg:mt-0">
                    {Array(5).fill(0).map((_, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                            <div className="h-3 bg-gray-700 rounded-xl w-16" />
                            <div className="h-3 bg-gray-600 rounded-xl w-12" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CoinSummarySectionLoading;
