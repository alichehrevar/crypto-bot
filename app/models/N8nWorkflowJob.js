const mongoose = require('mongoose');

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

module.exports = mongoose.model('N8nWorkflowJob', N8nWorkflowJobSchema);
