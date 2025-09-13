// app/components/crypto-news/utils.ts

import type { Article } from '@/types/news/NewsData';

/**
 * A constant holding Tailwind CSS classes to hide the scrollbar.
 */
export const noScrollbar = 'scrollbar-thin scrollbar-none';

/**
 * An object mapping article sentiment to specific Tailwind CSS text color classes.
 */
export const sentimentStyles: { [key in Article['sentiment']]: string } = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-gray-500 dark:text-gray-400',
};

/**
 * A helper function to generate a placeholder image URL based on the article's imageText.
 * @param item - The article object.
 * @returns A URL string for a placeholder image.
 */
export const getImageUrl = (item: Article): string => {
    const imgBg = '000000';
    const imgTextColor = 'FFFFFF';

    return `https://placehold.co/600x400/${imgBg}/${imgTextColor}?text=${encodeURIComponent(item.imageText)}`;
};
