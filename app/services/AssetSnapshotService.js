const User            = require('../models/User');
const BinanceAccount  = require('../models/BinanceAccount');
const OkxAccount      = require('../models/OkxAccount');
const BingxAccount    = require('../models/BingxAccount');
const AssetSnapshot   = require('../models/AssetSnapshot');
const BinanceWS       = require('./binanceWS');
const OkxWS           = require('./okxWS');
const BingxWS         = require('./bingXWS');

async function sumBalancesForUser(userId) {
    // load all three types of accounts
    const [binAccs, okxAccs, bingxAccs] = await Promise.all([
        BinanceAccount.find({ userId }).lean(),
        OkxAccount.find({ userId }).lean(),
        BingxAccount.find({ userId }).lean(),
    ]);

    // helper to sum balances array-of-accounts with a given service
    async function sumFor(accts, svc) {
        let sum = 0;
        for (let acct of accts) {
            const bal = await svc.getBalance(acct);
            sum += Number(bal) || 0;
        }
        return sum;
    }

    const [b, o, x] = await Promise.all([
        sumFor(binAccs, BinanceWS),
        sumFor(okxAccs,   OkxWS),
        sumFor(bingxAccs, BingxWS)
    ]);

    return { binance: b, okx: o, bingx: x, total: b + o + x };
}

async function takeSnapshotAllUsers() {
    const users = await User.find().select('_id').lean();
    await Promise.all(users.map(async u => {
        const { binance, okx, bingx, total } = await sumBalancesForUser(u._id);
        await AssetSnapshot.create({
            userId: u._id,
            balances: { binance, okx, bingx },
            total
        });
    }));
}

module.exports = { takeSnapshotAllUsers };
