const UserLocationHistory = require('../../models/UserLocationHistory');

class UserLocationService {

    /**
     * @param {string} userId
     * @param {number} lat
     * @param {number} lng
     * @param {string} ip
     * @param {string} source
     * @param {object} extraData - { city, country, deviceId, userAgent }
     */
    async log(userId, lat, lng, ip, source = 'general', extraData = {}) {
        // Validation: Ensure we have coordinates, otherwise mongo throws error
        if (!lat || !lng) return;

        try {
            await UserLocationHistory.create({
                userId: userId,
                location: {
                    type: 'Point',
                    coordinates: [lng, lat]
                },
                deviceInfo: {
                    ip: ip,
                    city: extraData.city || null,       // <--- Save City
                    country: extraData.country || null, // <--- Save Country
                    userAgent: extraData.userAgent || null
                },
                source: source,
                timestamp: new Date()
            });
        } catch (error) {
            console.error(`[LocationService] Error: ${error.message}`);
        }
    }
}

module.exports = new UserLocationService();
