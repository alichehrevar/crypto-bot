/**
 * @file Seeder script to ensure the default admin user exists and is up-to-date.
 */
const bcrypt = require('bcryptjs');
const User = require('../../app/models/User');
const UserInfo = require('../../app/models/UserInfo'); // <-- add this

const seedAdminUser = async () => {
    try {
        console.log('[Seeder] Ensuring default admin user…');
        const adminEmail = 'admin@tradingx.com';
        const adminPassword = 'password123123';

        // 1) Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // 2) Upsert the user atomically — use updateOne to get raw result (created vs updated)
        const userUpsert = await User.updateOne(
            { email: adminEmail },
            {
                $set: { password: hashedPassword },
                $setOnInsert: { email: adminEmail },
            },
            { upsert: true }
        );

        // 3) Fetch the user doc (we need _id for UserInfo)
        const user = await User.findOne({ email: adminEmail }).lean();
        if (!user) throw new Error('Admin user not found after upsert');

        if (userUpsert.upsertedId) {
            console.log('[Seeder] Admin user created:', adminEmail);
        } else {
            console.log('[Seeder] Admin user password updated:', adminEmail);
        }

        // 4) Ensure a matching UserInfo exists (atomic upsert that only inserts when absent)
        const defaultInfo = {
            firstName: 'Admin',
            lastName: 'User',
            gender: 'other',
            phoneCountry: '+1',
            phoneNumber: '0000000000',
            birthday: new Date('1990-01-01'),
            // avatar: '',               // optional
        };

        const infoUpsert = await UserInfo.updateOne(
            { userId: user._id },
            { $setOnInsert: { userId: user._id, ...defaultInfo } },
            { upsert: true }
        );

        if (infoUpsert.upsertedId) {
            console.log('[Seeder] Admin UserInfo created for:', adminEmail);
        } else {
            console.log('[Seeder] Admin UserInfo already exists for:', adminEmail);
        }

    } catch (error) {
        console.error('[Seeder] Error ensuring admin user exists:', error.message);
        throw error;
    }
};

module.exports = { seedAdminUser };
