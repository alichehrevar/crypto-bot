// app/components/crypto-news/NewsListView.tsx

import React, { useState, useMemo, useCallback } from 'react';

import NewsFilterBar from './NewsFilterBar';
import NewsListItem from './NewsListItem';
import NewsListSkeleton from './NewsListSkeleton';
import Pagination from './Pagination';

import { newsData, categories } from '@/types/news/NewsData';

interface NewsListViewProps {
    isLoading: boolean;
    onArticleSelect: (id: number) => void;
}

const noScrollbar = 'scrollbar-thin scrollbar-none';

const NewsListView: React.FC<NewsListViewProps> = ({ isLoading, onArticleSelect }) => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [activeFilter, setActiveFilter] = useState<string>('All');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const newsPerPage = 10;

    const filteredData = useMemo(() => {
        return newsData.filter(item => {
            const searchLower = searchTerm.toLowerCase();
            const filterLower = activeFilter.toLowerCase();
            const matchesFilter = filterLower === 'all' || item.tags.map(t => t.toLowerCase()).includes(filterLower);
            const matchesSearch = item.title.toLowerCase().includes(searchLower) || item.takeaway.toLowerCase().includes(searchLower);

            return matchesFilter && matchesSearch;
        });
    }, [searchTerm, activeFilter]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * newsPerPage;

        return filteredData.slice(startIndex, startIndex + newsPerPage);
    }, [filteredData, currentPage]);

    const totalPages = Math.ceil(filteredData.length / newsPerPage);

    const handleFilterChange = useCallback((category: string) => {
        setActiveFilter(category);
        setCurrentPage(1);
    }, []);

    const handleSearchChange = useCallback((term: string) => {
        setSearchTerm(term);
        setCurrentPage(1);
    }, []);

    return (
        <div className="p-6 flex flex-col h-full">
            <h1 className="text-3xl font-bold mb-4 flex-shrink-0 text-center text-black dark:text-white">
                Crypto Market News
            </h1>

            <NewsFilterBar
                activeFilter={activeFilter}
                categories={categories}
                searchTerm={searchTerm}
                onFilterChange={handleFilterChange}
                onSearchChange={handleSearchChange}
            />

            <div className={`flex-grow space-y-6 pt-1 overflow-y-auto ${noScrollbar}`}>
                {isLoading ? (
                    <NewsListSkeleton count={3} />
                ) : paginatedData.length > 0 ? (
                    paginatedData.map(item => (
                        <NewsListItem key={item.id} article={item} onSelect={onArticleSelect} />
                    ))
                ) : (
                    <div className="text-center mt-10 flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400">
                        No articles found.
                    </div>
                )}
            </div>

            {!isLoading && totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            )}
        </div>
    );
};

export default NewsListView;
