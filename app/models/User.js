const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'client'],
        default: 'client'
    },
    verifiedAt: { type: Date, default: null },
    enable2FA: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

userSchema.virtual('info', {
    ref: 'UserInfo',
    localField: '_id',
    foreignField: 'userId',
    justOne: true,
});

userSchema.virtual('locationHistory', {
    ref: 'UserLocationHistory',
    localField: '_id',
    foreignField: 'userId',
    options: { sort: { timestamp: -1 }}
});

userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Ensure virtuals are included when converting to JSON/Object
userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
