// app/components/crypto-news/Pagination.tsx

import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    return (
        <div className="flex-shrink-0 pt-4 flex justify-center items-center space-x-4">
            <button
                aria-label="Go to previous page"
                className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                disabled={currentPage === 1}
                onClick={handlePrevious}
            >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path
                        clipRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        fillRule="evenodd"
                    />
                </svg>
            </button>

            <span className="text-sm font-semibold w-16 text-center text-gray-700 dark:text-gray-300">
                {currentPage} / {totalPages}
            </span>

            <button
                aria-label="Go to next page"
                className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                disabled={currentPage === totalPages}
                onClick={handleNext}
            >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path
                        clipRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        fillRule="evenodd"
                    />
                </svg>
            </button>
        </div>
    );
};

export default Pagination;
