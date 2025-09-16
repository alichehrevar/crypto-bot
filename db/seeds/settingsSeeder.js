const Settings = require('../../app/models/Settings');

const seedSettings = async () => {
    try {
        console.log('🌱 Seeding settings...');
        const settingsData = {
            name: 'United Algos',
            description: 'A platform for trading cryptocurrencies.',
            version: '1.0.0',
            contactEmail: 'contact@unitedalgos.com',
            // termsOfService: 'https://example.com/terms',
            // privacyPolicy: 'https://example.com/privacy',
            supportEmail: 'support@unitedalgos.com',
            supportPhone: '+1234567890',
            defaultCurrency: 'USD',
            enableEmail: true,
        };

        // Use findOneAndUpdate with upsert to create the document if it doesn't exist,
        // or replace it if it does. This is a robust pattern for a singleton document.
        await Settings.findOneAndUpdate({}, settingsData, { upsert: true, new: true });

        console.log('✅ Settings seeded successfully.');
    } catch (err) {
        console.error('❌ Error seeding settings:', err.message || err);
    }
}

module.exports = { seedSettings };
