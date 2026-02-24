const IndicatorSettings = require('../../../models/IndicatorSettings');

exports.getSettings = async (req, res) => {
    try {
        // Find the global config, or create it with schema defaults if it doesn't exist
        let settings = await IndicatorSettings.findOne({ key: 'default' });
        if (!settings) {
            settings = await IndicatorSettings.create({ key: 'default' });
        }
        return res.status(200).json({ success: true, settings });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        // Strip out non-updatable fields if they exist in the payload
        const { _id, key, createdAt, updatedAt, __v, ...updateData } = req.body;

        const updated = await IndicatorSettings.findOneAndUpdate(
            { key: 'default' },
            { $set: updateData },
            { new: true, upsert: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Indicator defaults updated successfully.',
            data: { settings: updated }
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
