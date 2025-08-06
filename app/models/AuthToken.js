/**
 * @file Defines the Mongoose schema and model for tracking user authentication tokens (sessions).
 * @author Your Name
 */
const mongoose = require('mongoose');

/**
 * @description Schema for a stateful authentication token. Each document represents an active user session.
 */
const AuthTokenSchema = new mongoose.Schema({
    /**
     * @description The secure, random token string that is sent to the user. Indexed for fast lookups.
     */
    token: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    /**
     * @description The user associated with this token.
     */
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    /**
     * @description The date when this token will automatically expire.
     */
    expiresAt: {
        type: Date,
        required: true,
    },
    /**
     * @description Metadata about the session for security auditing.
     */
    userAgent: {
        type: String,
    },
    ipAddress: {
        type: String,
    }
}, {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
});

module.exports = mongoose.model('AuthToken', AuthTokenSchema);
