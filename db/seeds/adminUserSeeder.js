/**
 * @file Seeder script to ensure the default admin user exists and is up-to-date.
 * @author Your Name
 */
const bcrypt = require('bcryptjs');
const User = require('../../app/models/User'); // Adjust path to your User model if needed

/**
 * @description Creates or updates the default admin user using an atomic "upsert" operation.
 * This prevents race conditions in clustered environments.
 * It explicitly hashes the password because Mongoose 'pre-save' hooks are not
 * triggered by findOneAndUpdate by default.
 */
const seedAdminUser = async () => {
    try {
        console.log('[Seeder] Checking for default admin user...');
        const adminEmail = 'admin@tradingx.com';
        const adminPassword = 'password123123';

        // 1. Hash the default password.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // 2. Use findOneAndUpdate with `upsert: true`.
        // This is an atomic operation: it finds and updates, OR it creates if not found.
        // This completely prevents the race condition.
        const result = await User.findOneAndUpdate(
            { email: adminEmail }, // Find document by email
            {
                $set: { password: hashedPassword }, // Update these fields
                $setOnInsert: { email: adminEmail } // Only set email on initial creation
            },
            {
                upsert: true,  // <-- Creates the document if it doesn't exist
                new: true,     // <-- Returns the new/updated document
                runValidators: true,
            }
        );

        // The 'upsertedId' property exists only when a new document was created.
        if (result.upsertedId) {
            console.log('[Seeder] Default admin user created:', result.email);
        } else {
            console.log('[Seeder] Default admin user password updated:', result.email);
        }

    } catch (error) {
        console.error('[Seeder] Error ensuring admin user exists:', error.message);
        // We throw the error so the startup process can be halted if seeding is critical.
        throw error;
    }
};

module.exports = { seedAdminUser };
