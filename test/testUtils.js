function generateTestData(length, startPrice = 100) {
    return Array.from({ length }, (_, i) => ({
        timestamp: new Date(Date.now() - (length - i) * 60000),
        open: startPrice + i * 0.1,
        high: startPrice + i * 0.1 + 0.5,
        low: startPrice + i * 0.1 - 0.5,
        close: startPrice + i * 0.1,
        volume: 1000 + i * 10
    }));
}

module.exports = { generateTestData };
