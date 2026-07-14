require('dotenv').config();

module.exports = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    APP_URL: process.env.APP_URL,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    BOT_USERNAME: process.env.BOT_USERNAME || 'AutosVerify_bot',
    ADMIN_ID: process.env.ADMIN_ID || '8125978050',
    get ADMIN_PASSWORD() { return process.env.ADMIN_PASSWORD || 'admin123'; },
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'default_secret_key_32_bytes_long____',
    REQUIRED_CHANNEL_NAME: process.env.REQUIRED_CHANNEL_NAME || '@AutosVerify',
    REQUIRED_GROUP_NAME: process.env.REQUIRED_GROUP_NAME || '@AutosVerifyCh',
    REQUIRED_CHANNEL_ID: process.env.REQUIRED_CHANNEL_ID || '-1002088203586',
    REQUIRED_GROUP_ID: process.env.REQUIRED_GROUP_ID || '-1002188442004',
    REQUIRED_CHANNEL: process.env.REQUIRED_CHANNEL_NAME || '@AutosVerify',
    REQUIRED_GROUP: process.env.REQUIRED_GROUP_NAME || '@AutosVerifyCh',
    SKIP_MANDATORY_JOIN: process.env.SKIP_MANDATORY_JOIN !== 'false',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    SMTPLABS_API_KEY: process.env.SMTPLABS_API_KEY,
    BACKUP_BOT_TOKEN: process.env.BACKUP_BOT_TOKEN,
    BACKUP_CHAT_ID: process.env.BACKUP_CHAT_ID || '8125978050',
    USE_PROXY: process.env.USE_PROXY === 'true',
    PROXY_URL: process.env.PROXY_URL || '',
    TELEGRAM_API_BASE: process.env.TELEGRAM_API_BASE || 'https://api.telegram.org',
    PUBLIC_URL: process.env.APP_URL || process.env.PUBLIC_URL || 'https://autosverifybot-production.up.railway.app/',
    MINI_APP_URL: process.env.APP_URL || process.env.MINI_APP_URL || 'https://autosverifybot-production.up.railway.app/',
    // Allowed user IDs (admin + helpers) — comma-separated in ENV
    ALLOWED_USER_IDS: process.env.ALLOWED_USER_IDS ? process.env.ALLOWED_USER_IDS.split(',') : ['8125978050'],
    // Payment Methods
    PAYMENT_METHODS: {
        crypto: {
            enabled: true,
            name: 'Cryptocurrency (USDT TRC20)',
            address: process.env.USDT_ADDRESS || 'YOUR_USDT_TRC20_ADDRESS_HERE',
            ratePerCredit: 0.01
        }
    },
    // Support Settings
    SUPPORT_CHANNEL: '@Onlin_Income_Support',
    SUPPORT_COST: 10,
    REFERRAL_BONUS: 50
};
