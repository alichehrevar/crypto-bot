// app/components/crypto-news/ArticleDetailView.tsx

import type { Article } from '@/types/news/NewsData';

import React, { useRef } from 'react';

import { sentimentStyles, noScrollbar, getImageUrl } from './utils';
import CommentSection from './CommentSection';

interface ArticleDetailViewProps {
    article: Article;
    onGoBack: () => void;
}

const ArticleDetailView: React.FC<ArticleDetailViewProps> = ({ article, onGoBack }) => {
    const articleScrollRef = useRef<HTMLDivElement>(null);

    return (
        <div className="p-6 flex flex-col h-full">
            <div className="flex-shrink-0">
                <button
                    className="flex items-center space-x-2 transition-colors text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={onGoBack}>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-semibold">Back</span>
                </button>
            </div>

            <div ref={articleScrollRef} className={`flex-grow mt-5 relative pb-12 overflow-y-auto ${noScrollbar}`}>
                <img alt="Article" className="w-full h-64 object-cover rounded-3xl mb-6" src={getImageUrl(article)} />
                <h1 className="text-3xl font-bold mb-2 text-black dark:text-white">{article.title}</h1>
                <div className="text-sm mb-6 text-gray-500 dark:text-gray-400">
                    <span>{article.source}</span>
                    <span className="mx-2">&bull;</span>
                    <span className={sentimentStyles[article.sentiment]}>{article.sentiment.charAt(0).toUpperCase() + article.sentiment.slice(1)}</span>
                    <span className="mx-2">&bull;</span>
                    <span>{article.time}</span>
                </div>
                <div className="prose dark:prose-invert max-w-none leading-relaxed text-gray-700 dark:text-gray-300">
                    <p className="lead font-semibold text-lg text-black dark:text-white">{article.takeaway}</p>
                    <div dangerouslySetInnerHTML={{ __html: article.content }} />
                </div>
                <CommentSection />
            </div>
        </div>
    );
};

export default ArticleDetailView;
