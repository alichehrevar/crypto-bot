// test-telegram.js
require('dotenv').config();
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

console.log('--- Telegram Connection Test ---');
console.log(`Token:  ${token ? 'Loaded ✅' : 'Missing ❌'}`);
console.log(`ChatID: ${chatId ? 'Loaded (' + chatId + ') ✅' : 'Missing ❌'}`);

if (!token || !chatId) {
    console.error('Please fix your .env file first.');
    process.exit(1);
}

async function sendTest() {
    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        await axios.post(url, {
            chat_id: chatId,
            text: "<b>🔔 System Check</b>\nYour Node.js app is successfully connected to Telegram!",
            parse_mode: 'HTML'
        });
        console.log('\n✅ Success! Message sent. Check your Telegram now.');
    } catch (err) {
        console.error('\n❌ Failed to send message:');
        if (err.response) {
            console.error(`HTTP ${err.response.status}:`, err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

sendTest();
