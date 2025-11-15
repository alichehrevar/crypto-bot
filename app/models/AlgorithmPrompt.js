const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Stores an individual algorithm strategy prompt.
 *
 * A single User can have MANY of these prompts.
 */
const algorithmPromptSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Good to index this for fast lookups
    },
    /**
     * The 'Algorithm Prompt' text itself.
     */
    promptText: {
        type: String,
        required: [true, 'Algorithm prompt text is required']
    },
    /**
     * Tracks the lifecycle of this specific prompt.
     */
    status: {
        type: String,
        enum: ['Pending', 'Reviewed', 'Implemented', 'Rejected'],
        default: 'Pending'
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('AlgorithmPrompt', algorithmPromptSchema);
