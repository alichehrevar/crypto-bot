// app/components/CryptoNews.tsx

'use client';

import type {Article, Comment} from '@/types/news/NewsData';

import React, {useState, useMemo, useEffect, useCallback, useRef} from 'react';

import {newsData, categories, initialComments} from '@/types/news/NewsData';

// Helper for removing scrollbar (same as original)
const noScrollbar = 'scrollbar-thin scrollbar-none';

// Sentiment styles mapping
const sentimentStyles: { [key in Article['sentiment']]: string } = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-gray-500 dark:text-gray-400',
};

// --- Main Component ---
const CryptoNews: React.FC = () => {
    // --- STATE MANAGEMENT ---
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [activeFilter, setActiveFilter] = useState<string>('All');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [isFilterDropdownOpen, setFilterDropdownOpen] = useState<boolean>(false);
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [newComment, setNewComment] = useState<string>('');

    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const filterBtnRef = useRef<HTMLButtonElement>(null);
    const articleScrollRef = useRef<HTMLDivElement>(null);

    const newsPerPage = 10;

    // --- THEME HANDLING ---
    useEffect(() => {
        // This effect manages the theme class on the root <html> element
        const root = document.documentElement;

        root.classList.remove(theme === 'light' ? 'dark' : 'light');
        root.classList.add(theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));

    // --- DATA FILTERING & PAGINATION ---
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

    // --- EVENT HANDLERS (using useCallback for performance) ---
    const handleFilterChange = useCallback((category: string) => {
        setActiveFilter(category);
        setCurrentPage(1); // Reset to page 1 on filter change
        setFilterDropdownOpen(false);
    }, []);

    const handleArticleSelect = useCallback((articleId: number) => {
        const article = newsData.find(a => a.id === articleId);

        if (article) {
            setSelectedArticle(article);
            setComments(initialComments); // Reset comments for the new article
            articleScrollRef.current?.scrollTo(0, 0); // Scroll to top on article view
        }
    }, []);

    const handleGoBack = useCallback(() => {
        setSelectedArticle(null);
    }, []);

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newComment.trim()) {
            const comment: Comment = {author: 'You', avatarText: 'You', text: newComment.trim()};

            setComments(prev => [...prev, comment]);
            setNewComment('');
        }
    };

    // --- EFFECTS ---
    // Initial loading simulation
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1200);

        return () => clearTimeout(timer);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isFilterDropdownOpen &&
                filterDropdownRef.current &&
                !filterDropdownRef.current.contains(event.target as Node) &&
                !filterBtnRef.current?.contains(event.target as Node)
            ) {
                setFilterDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFilterDropdownOpen]);

    // --- HELPER FUNCTIONS ---
    const getImageUrl = (item: Article) => {
        const imgBg = theme === 'dark' ? '000000' : 'FFFFFF';
        const imgTextColor = theme === 'dark' ? 'FFFFFF' : '000000';

        return `https://placehold.co/600x400/${imgBg}/${imgTextColor}?text=${encodeURIComponent(item.imageText)}`;
    };

    // --- RENDER LOGIC ---
    return (
        <>
            <button
                className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white dark:bg-white dark:text-black px-4 py-2 rounded-full shadow-lg"
                onClick={toggleTheme}
            >
                Toggle Theme
            </button>

            <main className="flex items-center justify-center min-h-screen bg-white dark:bg-black p-4 sm:p-6 lg:p-8">
                <div
                    className="bg-white/80 dark:bg-black/80 backdrop-blur-sm border-2 border-black dark:border-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl h-[90vh] relative overflow-hidden">
                    {/* View Container: Transitions handled by conditional classes */}
                    <div
                        className={`absolute inset-0 p-6 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                            selectedArticle ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                        }`}
                    >
                        {/* News List Header */}
                        <h1 className="text-3xl font-bold mb-4 flex-shrink-0 text-center text-black dark:text-white">Crypto
                            Market News</h1>

                        {/* Search and Filter */}
                        <div className="mb-8 flex-shrink-0 w-full flex justify-center">
                            <div className="relative w-full sm:w-2/3 lg:w-5/12">
                                <input
                                    className="w-full p-3 pl-5 pr-24 border-2 border-gray-200 dark:border-gray-700 rounded-full focus:ring-0 focus:border-black dark:focus:border-white transition-all duration-300 bg-white dark:bg-black text-black dark:text-white"
                                    placeholder="Search news..."
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value)
                                        setCurrentPage(1)
                                    }}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 space-x-0.5">
                                    <button
                                        ref={filterBtnRef}
                                        className="p-2 rounded-full transition-colors text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        onClick={() => setFilterDropdownOpen(!isFilterDropdownOpen)}
                                    >
                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"/>
                                        </svg>
                                    </button>
                                    <button
                                        className="p-2 text-gray-400 rounded-full hover:text-blue-600 transition-colors">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"
                                             viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round"
                                                  strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                                {/* Filter Dropdown */}
                                {isFilterDropdownOpen && (
                                    <div ref={filterDropdownRef}
                                         className="absolute mt-2 w-36 bg-white/80 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10 right-0">
                                        <ul className="py-1 text-gray-700 dark:text-gray-300">
                                            {categories.sort().map(cat => (
                                                <li key={cat}>
                                                    <button
                                                        className="block px-4 py-2 text-sm rounded-md mx-1 my-0.5 hover:bg-blue-500 hover:text-white"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleFilterChange(cat);
                                                        }}>
                                                        {cat}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* News Container */}
                        <div className={`flex-grow overflow-y-auto space-y-6 pt-1 ${noScrollbar}`}>
                            {isLoading ? (
                                // Skeleton Loader
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i}
                                         className="bg-white dark:bg-black border-2 border-black/10 dark:border-white/10 rounded-3xl p-4 flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6 animate-pulse">
                                        <div
                                            className="w-full sm:w-48 h-32 sm:h-full flex-shrink-0 rounded-2xl bg-gray-200 dark:bg-gray-800"/>
                                        <div className="flex-grow w-full">
                                            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3"/>
                                            <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded w-full mb-4"/>
                                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"/>
                                        </div>
                                    </div>
                                ))
                            ) : paginatedData.length > 0 ? (
                                // Actual News Items
                                paginatedData.map(item => (
                                    <button key={item.id}
                                            className="group rounded-3xl p-4 flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6 border-2 border-black/10 dark:border-white/10 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer"
                                            onClick={() => handleArticleSelect(item.id)}>
                                        <div
                                            className="w-full sm:w-48 h-32 sm:h-full flex-shrink-0 rounded-2xl overflow-hidden relative">
                                            <img alt={item.title} className="w-full h-full object-cover"
                                                   src={getImageUrl(item)}/>
                                        </div>
                                        <div className="flex-grow">
                                            <h2 className="text-xl font-semibold mb-2 text-black dark:text-white">{item.title}</h2>
                                            <div
                                                className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-sm mb-3 flex items-start space-x-2.5 text-gray-700 dark:text-gray-300">
                                                <svg className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none"
                                                     stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                                                     xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                          strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                <p>{item.takeaway}</p>
                                            </div>
                                            <div
                                                className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                <span>{item.source}</span><span className="mx-2">&bull;</span><span
                                                className={sentimentStyles[item.sentiment]}>{item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}</span><span
                                                className="mx-2">&bull;</span><span>{item.time}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                // No Results Message
                                <div
                                    className="text-center mt-10 flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400">
                                    No articles found.
                                </div>
                            )}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && !isLoading && (
                            <div className="flex-shrink-0 pt-4 flex justify-center items-center space-x-4">
                                <button
                                    className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                >
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"
                                         xmlns="http://www.w3.org/2000/svg">
                                        <path clipRule="evenodd"
                                              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                              fillRule="evenodd"/>
                                    </svg>
                                </button>
                                <span
                                    className="text-sm font-semibold w-16 text-center text-gray-700 dark:text-gray-300">
                                  {currentPage} / {totalPages}
                                </span>
                                <button
                                    className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                >
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"
                                         xmlns="http://www.w3.org/2000/svg">
                                        <path clipRule="evenodd"
                                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                              fillRule="evenodd"/>
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Article Detail View */}
                    <div
                        className={`absolute inset-0 p-6 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                            selectedArticle ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
                        }`}
                    >
                        {selectedArticle && (
                            <>
                                <div className="flex-shrink-0">
                                    <button
                                        className="flex items-center space-x-2 transition-colors text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
                                        onClick={handleGoBack}>
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"
                                             viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round"
                                                  strokeLinejoin="round"/>
                                        </svg>
                                        <span className="font-semibold">Back</span>
                                    </button>
                                </div>

                                <div ref={articleScrollRef}
                                     className={`flex-grow overflow-y-auto mt-5 relative pb-12 ${noScrollbar}`}>
                                    <img alt="Article Image" className="w-full h-64 object-cover rounded-3xl mb-6"
                                         src={getImageUrl(selectedArticle)}/>
                                    <h1 className="text-3xl font-bold mb-2 text-black dark:text-white">{selectedArticle.title}</h1>
                                    <div className="text-sm mb-6 text-gray-500 dark:text-gray-400">
                                        <span>{selectedArticle.source}</span>
                                        <span className="mx-2">&bull;</span>
                                        <span
                                            className={sentimentStyles[selectedArticle.sentiment]}>{selectedArticle.sentiment.charAt(0).toUpperCase() + selectedArticle.sentiment.slice(1)}</span>
                                        <span className="mx-2">&bull;</span>
                                        <span>{selectedArticle.time}</span>
                                    </div>
                                    <div
                                        className="prose dark:prose-invert max-w-none leading-relaxed text-gray-700 dark:text-gray-300">
                                        <p className="lead font-semibold text-lg text-black dark:text-white">{selectedArticle.takeaway}</p>
                                        <div dangerouslySetInnerHTML={{__html: selectedArticle.content}}/>
                                    </div>

                                    {/* Comments Section */}
                                    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                                        <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">Comments</h2>
                                        <div className="space-y-6 mb-8">
                                            {comments.map((comment, index) => (
                                                <div key={index} className="flex items-start space-x-4">
                                                    <img alt="avatar" className="rounded-full"
                                                         src={`https://placehold.co/40x40/E2E8F0/4A5568?text=${comment.avatarText}`}/>
                                                    <div className="text-gray-700 dark:text-gray-300">
                                                        <p className="font-semibold text-black dark:text-white">{comment.author}</p>
                                                        <p className="text-sm">{comment.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <form onSubmit={handleCommentSubmit}>
                                              <textarea
                                                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-0 focus:border-black dark:focus:border-white transition-all duration-300 bg-white dark:bg-black text-black dark:text-white"
                                                  placeholder="Write a thoughtful comment..."
                                                  rows={3}
                                                  value={newComment}
                                                  onChange={(e) => setNewComment(e.target.value)}
                                              />
                                            <div className="flex justify-end">
                                                <button
                                                    className="mt-4 px-5 py-2 font-semibold rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-400 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-150 bg-[#9ef01a] hover:bg-[#8cd916] text-black"
                                                    type="submit">
                                                    Post Comment
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
};

export default CryptoNews;
