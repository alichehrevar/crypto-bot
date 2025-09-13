// app/components/crypto-news/NewsListItem.tsx

import type { Article } from '@/types/news/NewsData';

import React from 'react';

import { sentimentStyles, getImageUrl } from './utils';

interface NewsListItemProps {
    article: Article;
    onSelect: (id: number) => void;
}

const NewsListItem: React.FC<NewsListItemProps> = ({ article, onSelect }) => {
    return (
        <button
            className="group rounded-3xl p-4 flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6 border-2 border-black/10 dark:border-white/10 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer w-full text-left"
            onClick={() => onSelect(article.id)}>
            <div className="w-full sm:w-48 h-32 sm:h-full flex-shrink-0 rounded-2xl overflow-hidden relative">
                <img alt={article.title} className="w-full h-full object-cover" src={getImageUrl(article)} />
            </div>
            <div className="flex-grow">
                <h2 className="text-xl font-semibold mb-2 text-black dark:text-white">{article.title}</h2>
                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-sm mb-3 flex items-start space-x-2.5 text-gray-700 dark:text-gray-300">
                    {/* Info SVG */}
                    <p>{article.takeaway}</p>
                </div>
                <div className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <span>{article.source}</span><span className="mx-2">&bull;</span><span className={sentimentStyles[article.sentiment]}>{article.sentiment.charAt(0).toUpperCase() + article.sentiment.slice(1)}</span><span className="mx-2">&bull;</span><span>{article.time}</span>
                </div>
            </div>
        </button>
    );
};

export default NewsListItem;
