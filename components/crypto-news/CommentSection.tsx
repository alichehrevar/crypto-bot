// app/components/crypto-news/CommentSection.tsx

import type { Comment } from '@/types/news/NewsData';

import React, { useState } from 'react';

import { initialComments } from '@/types/news/NewsData';

const CommentSection: React.FC = () => {
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [newComment, setNewComment] = useState<string>('');

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newComment.trim()) {
            const comment: Comment = { author: 'You', avatarText: 'You', text: newComment.trim() };

            setComments(prev => [...prev, comment]);
            setNewComment('');
        }
    };

    return (
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">Comments</h2>
            <div className="space-y-6 mb-8">
                {comments.map((comment, index) => (
                    <div key={index} className="flex items-start space-x-4">
                        <img alt="avatar" className="rounded-full" src={`https://placehold.co/40x40/E2E8F0/4A5568?text=${comment.avatarText}`} />
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
    );
};

export default CommentSection;
