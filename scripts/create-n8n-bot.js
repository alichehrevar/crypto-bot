const BotBase = require('../app/models/BotBase');
const { CustomAIWorkflowJob_DefaultDB } = require('../app/models/N8nWorkflowJob');
require('../config/db');

(async () => {
    // 1. Find the latest synced AI Job
    const latestJob = await CustomAIWorkflowJob_DefaultDB.findOne({
        'responsePayload.generatedCode.fullCode': { $exists: true }
    }).sort({ createdAt: -1 });

    if (!latestJob) {
        console.log("❌ No synced N8n jobs found.");
        process.exit();
    }

    console.log(`✅ Found Strategy: ${latestJob._id}`);

    // 2. Create the Bot Configuration
    const newBot = new BotBase({
        symbol: "BTC/USDT",
        timeframe: "15m",
        botType: "technical",
        active: true,
        indicators: [
            {
                name: "N8NBotRunner",
                // THIS LINKS THE BOT TO THE AI CODE
                params: {
                    jobId: latestJob._id.toString(),
                    windowSize: 100 // Example param for the strategy
                }
            }
        ],
        marketInfo: { lastSignal: "HOLD" },
        tradeInfo: { signalProcessingMethod: "consensus" }
    });

    await newBot.save();
    console.log(`🚀 Bot Created! ID: ${newBot._id}`);
    console.log("Restart your main server to pick up the new bot.");
    process.exit();
})();
