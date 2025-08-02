export const compactNumber = (volume: number) => {
    return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(volume);
};
