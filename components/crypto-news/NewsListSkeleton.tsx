// app/components/crypto-news/NewsListSkeleton.tsx

import React from 'react';

interface NewsListSkeletonProps {
    count: number;
}

const NewsListSkeleton: React.FC<NewsListSkeletonProps> = ({ count }) => {
    return (
        <>
            {Array(count)
                .fill(0)
                .map((_, i) => (
                    <div
                        key={i}
                        className="bg-white dark:bg-black border-2 border-black/10 dark:border-white/10 rounded-3xl p-4 flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6 animate-pulse"
                    >
                        <div className="w-full sm:w-48 h-32 sm:h-full flex-shrink-0 rounded-2xl bg-gray-200 dark:bg-gray-800" />
                        <div className="flex-grow w-full">
                            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3" />
                            <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded w-full mb-4" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                        </div>
                    </div>
                ))}
        </>
    );
};

export default NewsListSkeleton;
