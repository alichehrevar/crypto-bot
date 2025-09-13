// app/components/CryptoNews.tsx

'use client';

import type { Article } from '@/types/news/NewsData';

import React, { useState, useEffect, useCallback } from 'react';

import NewsListView from './crypto-news/NewsListView';
import ArticleDetailView from './crypto-news/ArticleDetailView';

import { newsData } from '@/types/news/NewsData';

const CryptoNews: React.FC = () => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

    // Simulate initial data loading
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1200);

        return () => clearTimeout(timer);
    }, []);

    const handleArticleSelect = useCallback((articleId: number) => {
        const article = newsData.find(a => a.id === articleId);

        if (article) {
            setSelectedArticle(article);
        }
    }, []);

    const handleGoBack = useCallback(() => {
        setSelectedArticle(null);
    }, []);

    return (
        // The only change is on this line:
        <main className="flex justify-center w-full min-h-screen p-0 sm:p-8">
            <div className="backdrop-blur-sm rounded-[2.5rem] w-full max-w-7xl min-h-0 relative flex overflow-hidden shadow-2xl">
                {/* The rest of the component remains the same */}
                <div
                    className={`absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                        selectedArticle ? '-translate-x-full' : 'translate-x-0'
                    }`}
                >
                    <NewsListView
                        isLoading={isLoading}
                        onArticleSelect={handleArticleSelect}
                    />
                </div>
                <div
                    className={`absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                        selectedArticle ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    {selectedArticle && (
                        <ArticleDetailView
                            article={selectedArticle}
                            onGoBack={handleGoBack}
                        />
                    )}
                </div>
            </div>
        </main>
    );
};

export default CryptoNews;
