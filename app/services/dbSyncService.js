const mongoose = require('mongoose');
const {
    CustomAIWorkflowJob_DefaultDB,
    N8nWorkflowJob_CustomAiDB
} = require('../models/N8nWorkflowJob');

/**
 * Starts listening to the CustomAiDB for new inserts.
 */
async function syncImportedJobs() {
    try {
        console.log('📡 Listening for new imports on CustomAiDB...');

        // 1. Create a Change Stream on the Source Model
        // We filter strictly for 'insert' operations
        const changeStream = N8nWorkflowJob_CustomAiDB.watch([
            { $match: { operationType: 'insert' } }
        ]);

        // 2. Listen for the 'change' event
        changeStream.on('change', async (next) => {
            try {
                const sourceDoc = next.fullDocument;

                // console.log('⚡ New record detected:', sourceDoc._id);

                // 3. Map Source Data to Target Schema
                // Note: The sourceDoc might lack userId/webhookPath if imported via raw script,
                // so we provide fallbacks to prevent validation errors.

                const payloadToSave = {
                    // If source has userId, use it, otherwise use a default admin ID or placeholder
                    userId: sourceDoc.userId || new mongoose.Types.ObjectId('000000000000000000000000'),

                    type: sourceDoc.type || 'ai-model',

                    // Since the record has data, we assume it is completed
                    status: 'completed',

                    webhookPath: sourceDoc.webhookPath || 'imported-via-stream',

                    // MAPPING STRATEGY:
                    // Map 'response.input' from source -> 'requestPayload' in Main DB
                    requestPayload: sourceDoc.response?.input || {},

                    // Map the rest of 'response' -> 'responsePayload' in Main DB
                    responsePayload: {
                        generatedCode: sourceDoc.response?.generatedCode,
                        backtest: sourceDoc.response?.backtest,
                        status: sourceDoc.response?.status,
                        requestID: sourceDoc.response?.requestID
                    },

                    // Optional: Link validation error if present
                    error: sourceDoc.error || null
                };

                // 4. Save to Main DB
                await CustomAIWorkflowJob_DefaultDB.create(payloadToSave);

                console.log(`✅ Synced record ${sourceDoc._id} to Main DB`);

            } catch (err) {
                console.error('❌ Error processing sync:', err);
            }
        });

        changeStream.on('error', (error) => {
            console.error('⚠️ Change Stream Error:', error);
        });

    } catch (error) {
        console.error('❌ Failed to setup Change Stream:', error);
    }
}

module.exports = syncImportedJobs;
