const mongoose = require('mongoose');

const customAiDbConnection = require('../../config/customAiDb');

const N8nWorkflowJobSchema = new mongoose.Schema(
    {
        /**
         * The user who initiated this job.
         */
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        /**
         * The type of the workflow job.
         */
        type: {
            type: String,
            enum: ['ai-model', 'prompt'],
            required: true,
        },
        /**
         * The status of the workflow job.
         */
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending',
        },
        /**
         * The n8n webhook path that was called.
         */
        webhookPath: {
            type: String,
            required: true,
        },
        /**
         * The payload (body) sent to the n8n workflow.
         */
        requestPayload: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        /**
         * The final response received from the n8n workflow.
         */
        responsePayload: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        /**
         * A reference to the document holding the full response.
         * This keeps the main job document small and fast.
         */
        response: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'N8nJobResponse', // <-- Links to the n8nJobResponse model
            default: null,
        },
        /**
         * Any error message if the workflow failed.
         */
        error: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt timestamps
    }
);

const CustomAIWorkflowJob_DefaultDB = mongoose.model('CustomAIWorkflowJob', N8nWorkflowJobSchema);

const N8nWorkflowJob_CustomAiDB = customAiDbConnection.model('N8nWorkflowJob', N8nWorkflowJobSchema);

module.exports = {
    CustomAIWorkflowJob_DefaultDB,
    N8nWorkflowJob_CustomAiDB,
};
