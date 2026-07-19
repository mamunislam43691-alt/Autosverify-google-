const TelegramBot = require('node-telegram-bot-api');
process.env.NTBA_FIX_350 = "1";
const axios = require('axios');
let SocksProxyAgent;
try {
    const socksModule = require('socks-proxy-agent');
    // socks-proxy-agent v6+ uses named export, v5 uses default export
    SocksProxyAgent = socksModule.SocksProxyAgent || socksModule;
} catch (e) {
    SocksProxyAgent = null;
    console.warn('⚠️ socks-proxy-agent not installed — SOCKS proxy support disabled');
}


console.log('🏁 Bot script starting...');
const config = require('./config.js');
const tempMail = require('./services/tempmail-providers.js');
const oauth = require('./oauth.js');
const db = require('./db.js');
const { languages, getText, getUserLanguage } = require('./languages.js');
const fs = require('fs');
const path = require('path');
const apiGateway = require('./services/api-gateway.js');

// Store original console.log for internal logging
const originalConsoleLog = console.log.bind(console);

// Validate Config
const isValidToken = (t) => t && t !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE' && t !== 'undefined' && t !== 'null' && t.trim() !== '';

let bot = {
  // Deduplication helper for sending unique messages
  _recentMessages: new Map(), // key: `${chatId}:${msg}` -> timestamp
  _SEND_DUP_TIMEOUT: 3000,
  sendUniqueMessage(chatId, msg, opts = {}) {
    const key = `${chatId}:${msg}`;
    const now = Date.now();
    const last = this._recentMessages.get(key) || 0;
    if (now - last < this._SEND_DUP_TIMEOUT) return Promise.resolve();
    this._recentMessages.set(key, now);
    return bot.sendMessage(chatId, msg, opts);
  },
    on: () => {},
    onText: () => {},
    getMe: () => Promise.resolve({ username: 'MockBot', id: 0 }),
    sendMessage: () => Promise.resolve({}),
    startPolling: () => Promise.resolve(),
    setChatMenuButton: () => Promise.resolve(),
    getChat: () => Promise.reject(new Error('No token')),
    getChatMember: () => Promise.reject(new Error('No token')),
    editMessageText: () => Promise.resolve({}),
    answerCallbackQuery: () => Promise.resolve({})
};
let botOptions = {
    polling: false, // Wait for DB load
    polling_timeout: 30, // Increased for better stability
    polling_options: {
        interval: 2000, // Wait 2s between polls to reduce network strain
        allowed_updates: [
            'message',
            'channel_post',
            'callback_query',
            'chat_member',
            'my_chat_member',
            'inline_query'
        ]
    },
    baseApiUrl: config.TELEGRAM_API_BASE || 'https://api.telegram.org'
};

// Start Polling ONLY after DB is ready (Unlocks Phase 1 & 2)
db.dbReady.then(() => {
    console.log("🚀 Database Ready (Firebase/Local). Starting Bot...");
    
    // Evaluate token priority: 1. ENV, 2. Database
    const finalToken = config.TELEGRAM_BOT_TOKEN || (db.data && db.data.apiKeys && db.data.apiKeys.botToken);
    
    if (isValidToken(finalToken)) {
        // Apply Proxy if enabled
        if (config.USE_PROXY && config.PROXY_URL) {
            console.log(`🌐 Using Proxy for Bot Connection: ${config.PROXY_URL}`);
            if (config.PROXY_URL.startsWith('socks')) {
                if (SocksProxyAgent) {
                    botOptions.request = {
                        agent: new SocksProxyAgent(config.PROXY_URL)
                    };
                } else {
                    console.warn('⚠️ SOCKS proxy configured but socks-proxy-agent is not installed. Run: npm install socks-proxy-agent');
                }
            } else {
                botOptions.request = {
                    proxy: config.PROXY_URL
                };
            }
        }

        bot = new TelegramBot(finalToken, botOptions);

        // Inject bot into web server early
        try {
            const server = require('./database/server.js');
            server.setBot(bot);
        } catch (e) {
            console.error('⚠️ [ERROR] Failed to set bot in server:', e.message);
        }

        bot.startPolling();
        console.log('✅ Bot is now polling messages.');
        
        // Initialize all listeners
        setupBotListeners();
        
    } else {
        console.warn('⚠️ WARNING: TELEGRAM_BOT_TOKEN is missing or invalid in both ENV and DB. Bot functionality will be disabled.');
        // Mock bot object to prevent crashes
        bot = {
            on: () => {},
            onText: () => {},
            getMe: () => Promise.resolve({ username: 'MockBot', id: 0 }),
            sendMessage: () => Promise.resolve({}),
            startPolling: () => Promise.resolve(),
            setChatMenuButton: () => Promise.resolve(),
            getChat: () => Promise.reject(new Error('No token')),
            getChatMember: () => Promise.reject(new Error('No token')),
            editMessageText: () => Promise.resolve({}),
            answerCallbackQuery: () => Promise.resolve({})
        };
        
        // Inject mock bot into server too
        try {
            const server = require('./database/server.js');
            server.setBot(bot);
        } catch (e) {}
    }
});

// SMTP.DEV API Integration (Full Implementation)
const SMTP_API_BASE = 'https://api.smtp.dev';
const SMTP_API_KEY = config.SMTPLABS_API_KEY;

// Helper: Extract OTP from text — uses centralized robust extractor
const { extractOTP: _robustExtractOTP } = require('./services/otp-extractor');
function extractOTP(text, subject = '') {
    if (!text) return null;
    const result = _robustExtractOTP(text, subject);
    return result ? result.otp : null;
}


// Create a new email account via API Gateway (Generic Email Provider)
async function fetchSmtpLabsEmail() {
    try {
        const result = await apiGateway.executeWithFailover('email', async (provider) => {
            const randomUser = `user${Date.now()}${Math.floor(Math.random() * 1000)}`;
            const randomPass = `Pass${Date.now()}!`;
            const domain = '@smtp.dev';
            const emailAddress = randomUser + domain;

            const response = await axios.post(`${provider.apiUrl}/accounts`, {
                address: emailAddress,
                password: randomPass
            }, {
                headers: {
                    'X-API-KEY': provider.apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 8000
            });

            if (response.data && response.data.id) {
                const accountData = response.data;
                const inbox = accountData.mailboxes?.find(m => m.path === 'INBOX');

                return {
                    id: accountData.id,
                    email: accountData.address,
                    password: randomPass,
                    mailboxId: inbox?.id || null,
                    providerId: provider.id
                };
            }
            throw new Error('Invalid API Response Structure');
        });
        return result;
    } catch (e) {
        console.error('Email Service Error:', e.message);
        return null;
    }
}

// Get OTP from email inbox (Supports Multiple Providers)
async function getSmtpLabsOtp(email, accountId = null, mailboxId = null, providerId = null) {
    let apiBase = SMTP_API_BASE;
    let apiKey = SMTP_API_KEY;

    if (providerId) {
        const p = db.getProviderDecrypted(providerId);
        if (p) {
            apiBase = p.apiUrl;
            apiKey = p.apiKey;
        }
    }

    try {
        if (!email || !email.includes('@')) return null;
        const headers = { 'X-API-KEY': apiKey, 'Accept': 'application/json' };

        if (!accountId) {
            const res = await axios.get(`${apiBase}/accounts?address=${email}`, { headers, timeout: 5000 });
            if (res.data?.member?.length > 0) accountId = res.data.member[0].id;
            else return null;
        }

        if (!mailboxId) {
            const res = await axios.get(`${apiBase}/accounts/${accountId}/mailboxes`, { headers, timeout: 5000 });
            const inbox = res.data?.member?.find(m => m.path === 'INBOX');
            if (inbox) mailboxId = inbox.id;
            else return null;
        }

        const msgRes = await axios.get(`${apiBase}/accounts/${accountId}/mailboxes/${mailboxId}/messages`, { headers, timeout: 5000 });
        if (msgRes.data?.member?.length > 0) {
            const latestMsg = msgRes.data.member[0];
            const fullRes = await axios.get(`${apiBase}/accounts/${accountId}/mailboxes/${mailboxId}/messages/${latestMsg.id}`, { headers, timeout: 5000 });
            const fullMsg = fullRes.data;
            const body = fullMsg.body?.text || '';
            const subject = fullMsg.subject || latestMsg.subject || '';
            const textContent = `${subject} ${body}`;
            const otp = extractOTP(body, subject);


            return {
                otp: otp,
                subject: subject,
                from: fullMsg.from?.address || 'Unknown',
                date: fullMsg.createdAt || latestMsg.createdAt,
                fullMessage: textContent.substring(0, 500)
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}

function setupBotListeners() {
    if (!bot) return;

    // Suppress polling error logs with retry logic
    let retryCount = 0;
    let retryTimeout = null;

    bot.on('polling_error', (err) => {
        // Only log actual errors, not conflict warnings (409)
        if (err.code !== 'ETELEGRAM' || !err.message.includes('409')) {
            const isNetworkError = err.message.includes('ECONNRESET') || 
                                   err.message.includes('ETIMEDOUT') || 
                                   err.message.includes('ECONNREFUSED') ||
                                   err.message.includes('ENOTFOUND') ||
                                   err.message.includes('socket disconnected') ||
                                   err.message.includes('EHOSTUNREACH');

            if (isNetworkError) {
                retryCount++;
                // Exponential backoff: 5s, 10s, 20s, 30s... max 1 minute
                const delay = Math.min(60000, retryCount * 5000);
                
                console.log(`⚠️ Network issue: ${err.message}. Retrying in ${delay / 1000}s (Attempt ${retryCount})...`);
                
                if (err.message.includes('ENOTFOUND')) {
                    console.warn('💡 DNS Error: If this persists, Telegram might be blocked. Try setting USE_PROXY=true in config.js');
                }

                if (retryTimeout) clearTimeout(retryTimeout);
                
                retryTimeout = setTimeout(async () => {
                    try {
                        console.log('🔄 Attempting to reconnect bot...');
                        if (bot.isPolling()) {
                            await bot.stopPolling();
                            await new Promise(r => setTimeout(r, 1000));
                        }
                        await bot.startPolling();
                        console.log('✅ Bot reconnected successfully.');
                        retryCount = 0; // Reset count on success
                    } catch (e) {
                        console.log('⚠️ Reconnection attempt failed:', e.message);
                    }
                }, delay);
            } else {
                console.log(`❌ Bot error: ${err.message}`);
            }
        }
    });

    // Reset retry count on successful message
    bot.on('message', () => { retryCount = 0; });

    // File logging disabled as requested by user

    console.log('🤖 Telegram Verification Bot Started');
    console.log('📊 Activity: Bot is running and waiting for users...');

    bot.getMe().then(me => {
        console.log(`📊 Activity: Bot connected as @${me.username}`);
        if (!db.data.settings) db.data.settings = {};
        db.data.settings.botUsername = me.username;
        db.save();

        // Validate mandatory channels
        validateMandatoryChannels();
    }).catch(err => {
        // Silently handle connection errors
    });

// Validate mandatory channels on startup
let channelsValidated = false;
let channelsAccessible = false;

async function validateMandatoryChannels() {
    if (config.SKIP_MANDATORY_JOIN) {
        console.log('⏭️ Mandatory join check is DISABLED (SKIP_MANDATORY_JOIN=true)');
        channelsValidated = true;
        channelsAccessible = false;
        return;
    }

    try {
        let channelOk = false;
        let groupOk = false;

        if (config.REQUIRED_CHANNEL) {
            try {
                const chat = await bot.getChat(config.REQUIRED_CHANNEL);
                console.log(`✅ Channel accessible: ${chat.title || config.REQUIRED_CHANNEL}`);
                channelOk = true;
            } catch (e) {
                console.warn(`⚠️ Channel not accessible: ${config.REQUIRED_CHANNEL} - ${e.message}`);
                console.warn('   Users will be blocked until this is fixed or SKIP_MANDATORY_JOIN is enabled');
            }
        } else {
            channelOk = true;
        }

        if (config.REQUIRED_GROUP) {
            try {
                const chat = await bot.getChat(config.REQUIRED_GROUP);
                console.log(`✅ Group accessible: ${chat.title || config.REQUIRED_GROUP}`);
                groupOk = true;
            } catch (e) {
                console.warn(`⚠️ Group not accessible: ${config.REQUIRED_GROUP} - ${e.message}`);
                console.warn('   Users will be blocked until this is fixed or SKIP_MANDATORY_JOIN is enabled');
            }
        } else {
            groupOk = true;
        }

        channelsValidated = true;
        channelsAccessible = channelOk && groupOk;

        if (!channelsAccessible) {
            console.warn('\n⚠️⚠️⚠️ MANDATORY CHANNELS NOT ACCESSIBLE ⚠️⚠️⚠️');
            console.warn('To fix this, either:');
            console.warn('1. Create the channels and add the bot as admin');
            console.warn('2. Update REQUIRED_CHANNEL and REQUIRED_GROUP in config.js');
            console.warn('3. Set SKIP_MANDATORY_JOIN=true in config.js to disable this check\n');
        }
    } catch (e) {
        console.error('Error validating channels:', e.message);
    }
}

// Helper: Check if membership check should be skipped
function shouldSkipMembershipCheck() {
    // 1. Check hardcoded config (Emergency override)
    if (config.SKIP_MANDATORY_JOIN === true || config.SKIP_MANDATORY_JOIN === 'true') return true;

    // 2. Check dynamic database flag (Feature Flags from Admin Panel)
    const flags = db.data?.featureFlags || {};
    if (flags.joinRequired === false) return true;

    // 3. If no channel/group configured, skip
    const apiKeys = db.data?.apiKeys || {};
    const settings = db.data?.settings || {};
    const channel = apiKeys.requiredChannel || settings.requiredChannel || config.REQUIRED_CHANNEL;
    const group = apiKeys.requiredGroup || settings.requiredGroup || config.REQUIRED_GROUP;
    
    if (!channel && !group) return true;

    return false;
}

bot.on('message', (msg) => {
    console.log(`[DEBUG] RAW MESSAGE RECEIVED from ${msg.from?.id}: ${msg.text}`);
});

// ==================== LIVESTREAM AUTO-JOIN ASSISTANT & AUTO-REACTION ====================
const activeLiveStreamPins = new Map(); // chatId -> messageId
const lastLiveStreamBroadcast = new Map(); // chatId -> timestamp

async function broadcastLiveStreamStart(chatId, chatTitle, joinLink) {
    try {
        const now = Date.now();
        const lastTime = lastLiveStreamBroadcast.get(chatId) || 0;
        if (now - lastTime < 300000) { // 5-minute deduplication window
            console.log(`[LIVESTREAM] Duplicate start broadcast prevented for chat ${chatId}`);
            return;
        }
        lastLiveStreamBroadcast.set(chatId, now);

        const groupSettings = db.data?.adminSettings?.groupManagement || {};
        if (groupSettings.enableLiveStreamAlerts === false) {
            console.log(`[LIVESTREAM] Broadcast alerts are disabled in Group Management settings. Skipping alert broadcast.`);
            return;
        }

        const users = db.getUsers();
        const apiKeys = db.data?.apiKeys || {};
        const settings = db.data?.settings || {};
        
        const requiredChannel = apiKeys.requiredChannel || settings.requiredChannel || config.REQUIRED_CHANNEL || '';
        const requiredGroup = apiKeys.requiredGroup || settings.requiredGroup || config.REQUIRED_GROUP || '';

        console.log(`📣 Broadcasting livestream start in "${chatTitle}" to users, groups, and channels...`);

        const messageText = `🎙️ *Live Stream Started!*\n\n` +
            `Admins have started a live stream in *"${chatTitle}"*. Click the button below to join the stream and participate!`;

        const replyMarkup = {
            inline_keyboard: [[
                { text: '🎙️ Join Live Stream', url: joinLink }
            ]]
        };

        // 1. Post in the required/monitored channel
        if (requiredChannel) {
            try {
                const channelId = requiredChannel.startsWith('@') ? requiredChannel : `@${requiredChannel}`;
                await bot.sendMessage(channelId, messageText, {
                    parse_mode: 'Markdown',
                    reply_markup: replyMarkup
                });
                console.log(`[LIVESTREAM] Posted stream announcement to channel: ${channelId}`);
            } catch (err) {
                console.log(`[LIVESTREAM] Failed to post in required channel: ${err.message}`);
            }
        }

        // 2. Send to all registered bot users' private chats
        if (users && users.length > 0) {
            for (const user of users) {
                try {
                    await bot.sendMessage(user.id, messageText, {
                        parse_mode: 'Markdown',
                        reply_markup: replyMarkup
                    });
                    // Small delay to prevent Telegram flooding limits
                    await new Promise(resolve => setTimeout(resolve, 80));
                } catch (err) {
                    // Ignore failures for blocked/inactive chats
                }
            }
        }
    } catch (e) {
        console.error('Error broadcasting livestream start:', e);
    }
}

// Global map to track which users have already been auto-unmuted/unrestricted
const unmutedUsersTracker = new Map(); // "chatId_userId" -> boolean

async function scheduleAutoUnmute(chatId, user) {
    if (!user || user.is_bot) return;
    const key = `${chatId}_${user.id}`;
    if (unmutedUsersTracker.get(key)) return; // Only unmute once to respect manual admin mute afterwards
    
    unmutedUsersTracker.set(key, true);
    console.log(`[AUTO-UNMUTE] User ${user.first_name || 'User'} (${user.id}) joined/active in ${chatId}. Scheduling unmute in 60s...`);

    setTimeout(async () => {
        try {
            // Check if user is still in the group and not banned/kicked
            const chatMember = await bot.getChatMember(chatId, user.id);
            if (['left', 'kicked', 'banned'].includes(chatMember.status)) {
                console.log(`[AUTO-UNMUTE] User ${user.id} is no longer in chat ${chatId}, skipping.`);
                return;
            }

            // Unrestrict the user (grant full permissions to send voice notes, media, text, etc.)
            await bot.restrictChatMember(chatId, user.id, {
                permissions: {
                    can_send_messages: true,
                    can_send_audios: true,
                    can_send_documents: true,
                    can_send_photos: true,
                    can_send_videos: true,
                    can_send_video_notes: true,
                    can_send_voice_notes: true,
                    can_send_polls: true,
                    can_send_other_messages: true,
                    can_add_web_page_previews: true,
                    can_change_info: false,
                    can_invite_users: true,
                    can_pin_messages: false
                }
            });

            console.log(`[AUTO-UNMUTE] Successfully unrestricted/unmuted ${user.first_name || 'User'} (${user.id}) in chat ${chatId}`);

            // Send polite notification in English only
            const noticeText = `🎙️ **Auto-Unmute Activated**\n\nNew participant **${user.first_name || 'User'}** has been granted permission to talk. (Auto-unmuted after 1 minute) 😊`;
            const noticeMsg = await bot.sendMessage(chatId, noticeText, { parse_mode: 'Markdown' }).catch(() => {});
            
            if (noticeMsg) {
                // Auto delete notice to keep group chat tidy
                setTimeout(() => {
                    bot.deleteMessage(chatId, noticeMsg.message_id).catch(() => {});
                }, 20000);
            }
        } catch (err) {
            console.error(`[AUTO-UNMUTE] Failed to unmute user ${user.id} in chat ${chatId}:`, err.message);
        }
    }, 60000); // Wait exactly 1 minute
}

async function handleLiveStreamEvent(chatId, eventType, msg) {
    try {
        const settings = db.data?.adminSettings?.groupManagement || {};
        // Enabled by default unless explicitly disabled
        if (settings.autoJoinLiveStream === false) return;

        if (eventType === 'started') {
            console.log(`[LIVESTREAM] Auto-join triggered for chat ${chatId}`);
            
            const assistantMsgText = `🎙️ **Bot Assistant Live Stream Protection Active!**\n\n` +
                `🛡️ **Active Background Protection:** Enabled\n` +
                `🚫 **Channel Accounts:** Blocked immediately on join\n` +
                `🎙️ **Voice Chat Participants:** Auto-unmuted after 1 minute`;
            
            const sentMsg = await bot.sendMessage(chatId, assistantMsgText, { parse_mode: 'Markdown' });
            if (sentMsg && sentMsg.message_id) {
                activeLiveStreamPins.set(chatId, sentMsg.message_id);
                await bot.pinChatMessage(chatId, sentMsg.message_id).catch(err => {
                    console.warn(`[LIVESTREAM] Failed to pin assistant message in ${chatId}: ${err.message}`);
                });
            }

            // Build join link
            let joinLink = '';
            if (msg.chat && msg.chat.username) {
                joinLink = `https://t.me/${msg.chat.username}`;
            } else if (msg.chat && msg.chat.invite_link) {
                joinLink = msg.chat.invite_link;
            } else {
                try {
                    const chatInfo = await bot.getChat(chatId);
                    if (chatInfo.invite_link) {
                        joinLink = chatInfo.invite_link;
                    } else if (chatInfo.username) {
                        joinLink = `https://t.me/${chatInfo.username}`;
                    }
                } catch (e) {
                    const cleanId = String(chatId).replace('-100', '');
                    joinLink = `https://t.me/c/${cleanId}`;
                }
            }
            if (!joinLink) {
                const cleanId = String(chatId).replace('-100', '');
                joinLink = `https://t.me/c/${cleanId}`;
            }

            const chatTitle = (msg.chat && msg.chat.title) || 'Our Group/Channel';
            
            // Broadcast to private chats of all users
            broadcastLiveStreamStart(chatId, chatTitle, joinLink);
        } else if (eventType === 'ended') {
            console.log(`[LIVESTREAM] Auto-leave triggered for chat ${chatId}`);
            const pinnedId = activeLiveStreamPins.get(chatId);
            if (pinnedId) {
                await bot.unpinChatMessage(chatId, { message_id: pinnedId }).catch(err => {
                    bot.unpinChatMessage(chatId).catch(() => {});
                });
                activeLiveStreamPins.delete(chatId);
                
                let leaveMsg = `🎙️ **Live stream has ended.** Bot Assistant has left the stream.`;
                if (settings.userbotEnabled && settings.userbotMusicPlayback) {
                    leaveMsg += `\n🎵 **Music/Audio Playback player stopped.**`;
                }
                await bot.sendMessage(chatId, leaveMsg, { parse_mode: 'Markdown' });
            }
        }
    } catch (err) {
        console.error(`[LIVESTREAM] Error handling live stream event:`, err);
    }
}

async function handleAutoReaction(msg) {
    try {
        if (!msg.chat || !msg.message_id) return;
        const settings = db.data?.adminSettings?.groupManagement || {};
        // Enabled by default unless explicitly disabled
        if (settings.autoChannelReaction === false) return;

        // Choose a random emoji reaction
        const emojis = ['👍', '❤️', '🔥', '🎉', '🤩', '👏', '⚡'];
        const chosenEmoji = emojis[Math.floor(Math.random() * emojis.length)];

        console.log(`[AUTO_REACTION] Attempting reaction ${chosenEmoji} on message ${msg.message_id} in chat ${msg.chat.id}`);

        await bot._request('setMessageReaction', {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reaction: [{ type: 'emoji', emoji: chosenEmoji }]
        }).catch(err => {
            console.warn(`[AUTO_REACTION] Failed to set reaction on message ${msg.message_id}: ${err.message}`);
        });
    } catch (err) {
        console.error(`[AUTO_REACTION] Error in reaction handler:`, err);
    }
}

// Detect live stream start/end events in messages
bot.on('message', async (msg) => {
    if (!msg.chat) return;
    if (msg.video_chat_started || msg.voice_chat_started) {
        await handleLiveStreamEvent(msg.chat.id, 'started', msg);
    } else if (msg.video_chat_ended || msg.voice_chat_ended) {
        await handleLiveStreamEvent(msg.chat.id, 'ended', msg);
    }
});

// Detect live stream start/end events and reactions in channel posts
bot.on('channel_post', async (msg) => {
    if (!msg.chat) return;
    
    // Check if live stream event
    if (msg.video_chat_started || msg.voice_chat_started) {
        await handleLiveStreamEvent(msg.chat.id, 'started', msg);
    } else if (msg.video_chat_ended || msg.voice_chat_ended) {
        await handleLiveStreamEvent(msg.chat.id, 'ended', msg);
    } else {
        // Trigger auto reaction for regular channel posts
        await handleAutoReaction(msg);
        // Respond to the post with our unified AI chatbot
        await handleGroupOrChannelChat(msg, true);
    }
});

// ==================== CHANNEL ACCOUNT BLOCKER (LIVE STREAM PROTECTION) ====================
// Automatically identify and block/ban channels used to join or post in groups/channels instead of real profiles
bot.on('message', async (msg) => {
    try {
        if (!msg.chat) return;
        if (!['group', 'supergroup', 'channel'].includes(msg.chat.type)) return;

        // Get group management settings
        const settings = db.data?.adminSettings?.groupManagement || {};
        // Enabled by default unless explicitly disabled
        if (settings.blockChannelAccounts === false) return;

        // Check if the message is sent on behalf of a channel (sender_chat type channel)
        if (msg.sender_chat && msg.sender_chat.type === 'channel') {
            const chatId = msg.chat.id;
            const channelId = msg.sender_chat.id;
            const channelTitle = msg.sender_chat.title || 'Channel';
            const channelUsername = msg.sender_chat.username ? `@${msg.sender_chat.username}` : '';

            // Guard: If this is the configured discussion channel of this group, DO NOT ban it!
            const apiKeys = db.data?.apiKeys || {};
            const requiredChannelId = apiKeys.requiredChannelId || config.REQUIRED_CHANNEL_ID || '';
            const requiredChannel = apiKeys.requiredChannel || db.data?.settings?.requiredChannel || config.REQUIRED_CHANNEL || '';
            
            const isRequiredChannel = (
                String(channelId) === String(requiredChannelId) ||
                (channelUsername && channelUsername.toLowerCase().replace('@', '') === requiredChannel.toLowerCase().replace('@', ''))
            );

            if (isRequiredChannel) {
                console.log(`[CHANNEL_BLOCK] Skipping linked required channel: ${channelTitle} (${channelId})`);
                return;
            }

            console.log(`[CHANNEL_BLOCK] Channel account detected! Title: ${channelTitle}, ID: ${channelId}, Chat: ${msg.chat.title} (${chatId})`);

            // 1. Delete the triggering message
            await bot.deleteMessage(chatId, msg.message_id).catch(e => {
                console.warn(`[CHANNEL_BLOCK] Failed to delete message: ${e.message}`);
            });

            // 2. Ban the sender chat (the channel itself) from the group
            let banned = false;
            try {
                if (typeof bot.banChatSenderChat === 'function') {
                    await bot.banChatSenderChat(chatId, channelId);
                    banned = true;
                    console.log(`[CHANNEL_BLOCK] Banned channel via standard banChatSenderChat`);
                }
            } catch (err) {
                console.warn(`[CHANNEL_BLOCK] standard banChatSenderChat failed: ${err.message}, trying direct request...`);
            }

            if (!banned) {
                try {
                    await bot._request('banChatSenderChat', { chat_id: chatId, sender_chat_id: channelId });
                    banned = true;
                    console.log(`[CHANNEL_BLOCK] Banned channel via direct API request`);
                } catch (err) {
                    console.error(`[CHANNEL_BLOCK] Banned channel request failed: ${err.message}`);
                }
            }

            // 3. Notify the group/livestream that a channel account was blocked
            if (banned) {
                const warnMsgText = `🚫 **Group Protection Activated**\n\nChannel accounts are not allowed to join or message in this group/live stream.\n\nBanned channel account: **${channelTitle}** ${channelUsername}`;
                const warnMsg = await bot.sendMessage(chatId, warnMsgText, { parse_mode: 'Markdown' }).catch(() => {});
                if (warnMsg && warnMsg.message_id) {
                    // Auto-delete the warning after 10 seconds to keep the group tidy
                    setTimeout(() => {
                        bot.deleteMessage(chatId, warnMsg.message_id).catch(() => {});
                    }, 10000);
                }
            }
        }
    } catch (e) {
        console.error('[CHANNEL_BLOCK] Handler Error:', e);
    }
});

// Global Error Handlers - silent
process.on('unhandledRejection', (e) => { console.error('unhandledRejection:', e); });
process.on('uncaughtException', (e) => { console.error('uncaughtException:', e); });

// Manage State 
const userState = {};

// Helper: Check authorization (Main Admin + Helper Admins)
function isAdmin(userId) {
    // Main admin
    if (String(userId) === String(config.ADMIN_ID)) return true;
    
    // Allowed user IDs from config
    if (config.ALLOWED_USER_IDS.includes(String(userId))) return true;
    
    // ✅ NEW: Check helper admins from database
    const user = db.getUser(userId);
    if (user && user.role === 'helper_admin' && user.helperAdminEnabled === true) {
        return true;
    }
    
    return false;
}

// Helper: Check if userbot is fully enabled and configured
function isUserbotConfigured() {
    const settings = db.data?.adminSettings?.groupManagement || {};
    return settings.userbotEnabled === true && 
           typeof settings.userbotSessionString === 'string' && 
           settings.userbotSessionString.trim().length > 0;
}

// ✅ NEW: Check if user is main admin (not helper)
function isMainAdmin(userId) {
    return String(userId) === String(config.ADMIN_ID);
}

// Helper: Generate user authentication token for web panel
function generateUserAuthToken(userId) {
    const crypto = require('crypto');
    const secret = config.TELEGRAM_BOT_TOKEN || 'secret_key';
    const timestamp = Date.now();
    const data = `${userId}:${timestamp}`;
    const hash = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return `${hash}:${timestamp}`;
}

// Helper: Verify user authentication token
function verifyUserAuthToken(userId, token) {
    const crypto = require('crypto');
    const secret = config.TELEGRAM_BOT_TOKEN || 'secret_key';
    const [hash, timestamp] = token.split(':');

    if (!hash || !timestamp) return false;

    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 24 * 60 * 60 * 1000) return false;

    const data = `${userId}:${timestamp}`;
    const expectedHash = crypto.createHmac('sha256', secret).update(data).digest('hex');

    return hash === expectedHash;
}

// Helper: Check if feature is enabled - returns true if enabled, sends Coming Soon message if disabled
function checkFeatureEnabled(bot, chatId, userId, featureKey, query) {
    const isEnabled = db.isFeatureEnabled(featureKey);
    if (!isEnabled) {
        const comingSoonMsg = `⏳ **Coming Soon!**\n\nThis feature is currently under development.\nStay tuned for updates!`;

        if (query) {
            bot.answerCallbackQuery(query.id, {
                text: "⏳ Coming Soon!",
                show_alert: true
            });
        }

        bot.sendMessage(chatId, comingSoonMsg, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: '🔙 Back', callback_data: 'main_menu' }]]
            }
        });
        return false;
    }
    return true;
}

// Helper: Show Broadcast Options
async function showBroadcastOptions(chatId, userId) {
    const state = userState[userId];
    if (!state) return;

    // Message is required only if no media
    if (!state.mediaType && !state.message) return;

    const buttonsCount = state.buttons.length;
    const mediaInfo = state.mediaType ? `📎 ${state.mediaType === 'photo' ? 'Photo' : 'Video'} attached\n` : '';

    const msg = `✅ **Message Received!**\n\n` +
        `${mediaInfo}` +
        `📝 Message: ${state.message.substring(0, 100)}${state.message.length > 100 ? '...' : ''}\n` +
        `🔘 Buttons: ${buttonsCount}\n\n` +
        `**What's next?**`;
    const keyboard = {
        inline_keyboard: [
            [
                { text: '➕ Add Button', callback_data: 'broadcast_add_button' },
                { text: '👁️ Preview', callback_data: 'broadcast_preview' }
            ],
            [
                { text: '📤 Send Now', callback_data: 'broadcast_send_confirm' },
                { text: '🕒 Schedule', callback_data: 'broadcast_schedule' }
            ],
            [
                { text: '❌ Cancel', callback_data: 'broadcast_cancel' }
            ]
        ]
    };

    try {
        if (state.optionsMessageId) {
            // Edit existing message
            await bot.editMessageText(msg, {
                chat_id: chatId,
                message_id: state.optionsMessageId,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            // Send new message and store ID
            const sentMsg = await bot.sendMessage(chatId, msg, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
            userState[userId].optionsMessageId = sentMsg.message_id;
        }
    } catch (error) {
        console.error('Error showing broadcast options:', error);
        // If edit fails, send new message
        const sentMsg = await bot.sendMessage(chatId, msg, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
        userState[userId].optionsMessageId = sentMsg.message_id;
    }
}

// Helper: Check if user is member of required channel and group
async function checkMembership(userId) {
    // Skip check if disabled in config
    if (shouldSkipMembershipCheck()) {
        return { channel: true, group: true, skipped: true };
    }

    try {
        const results = {
            channel: false,
            group: false,
            channelError: null,
            groupError: null
        };
        const validStatuses = ['creator', 'administrator', 'member', 'restricted'];

        // Get dynamic config from DB
        const apiKeys = db.data?.apiKeys || {};
        const settings = db.data?.settings || {};
        
        const requiredChannelId = apiKeys.requiredChannelId || config.REQUIRED_CHANNEL_ID;
        const requiredChannelName = apiKeys.requiredChannel || settings.requiredChannel || config.REQUIRED_CHANNEL;
        
        const requiredGroupId = apiKeys.requiredGroupId || config.REQUIRED_GROUP_ID;
        const requiredGroupName = apiKeys.requiredGroup || settings.requiredGroup || config.REQUIRED_GROUP;

        // Check channel membership
        if (requiredChannelId || requiredChannelName) {
            try {
                // Try ID first if it looks like one, otherwise use name
                const targetChannel = requiredChannelId || requiredChannelName;
                const channelMember = await bot.getChatMember(targetChannel, userId);
                results.channel = validStatuses.includes(channelMember.status);
            } catch (error) {
                results.channelError = error.message;
                if ((error.message.includes('chat not found') || error.message.includes('PARTICIPANT_ID_INVALID')) && requiredChannelName && requiredChannelName !== requiredChannelId) {
                    try {
                        const channelMember = await bot.getChatMember(requiredChannelName, userId);
                        results.channel = validStatuses.includes(channelMember.status);
                    } catch (e2) {
                        results.channel = (config.SKIP_MANDATORY_JOIN === true || config.SKIP_MANDATORY_JOIN === 'true');
                    }
                } else {
                    if (!error.message.includes('chat not found') && !error.message.includes('PARTICIPANT_ID_INVALID')) {
                        console.log(`[MEMBERSHIP] Channel check for ${userId} (${requiredChannelId}): ${error.message}`);
                    }
                    results.channel = (config.SKIP_MANDATORY_JOIN === true || config.SKIP_MANDATORY_JOIN === 'true');
                }
            }
        } else {
            results.channel = true; // No channel required
        }

        // Check group membership
        if (requiredGroupId || requiredGroupName) {
            try {
                const targetGroup = requiredGroupId || requiredGroupName;
                const groupMember = await bot.getChatMember(targetGroup, userId);
                results.group = validStatuses.includes(groupMember.status);
            } catch (error) {
                results.groupError = error.message;
                if ((error.message.includes('chat not found') || error.message.includes('PARTICIPANT_ID_INVALID')) && requiredGroupName && requiredGroupName !== requiredGroupId) {
                    try {
                        const groupMember = await bot.getChatMember(requiredGroupName, userId);
                        results.group = validStatuses.includes(groupMember.status);
                    } catch (e2) {
                        results.group = (config.SKIP_MANDATORY_JOIN === true || config.SKIP_MANDATORY_JOIN === 'true');
                    }
                } else {
                    if (!error.message.includes('chat not found') && !error.message.includes('PARTICIPANT_ID_INVALID')) {
                        console.log(`[MEMBERSHIP] Group check for ${userId} (${requiredGroupId}): ${error.message}`);
                    }
                    results.group = (config.SKIP_MANDATORY_JOIN === true || config.SKIP_MANDATORY_JOIN === 'true');
                }
            }
        } else {
            results.group = true; // No group required
        }

        return results;
    } catch (error) {
        console.error('Membership check fatal error:', error);
        // Fail-open strategy: if bot is broken, let users through to prevent total outage
        return { channel: true, group: true, skipped: true };
    }
}

function showMandatoryJoin(chatId, membership, msgId = null, isFirstTime = false) {
    // Get settings from database (admin panel configured)
    const settings = db.getSettings ? db.getSettings() : (db.data.settings || {});
    const apiKeys = db.data?.apiKeys || {};

    // Use admin panel configured channel/group names or fallbacks
    const channelName = apiKeys.requiredChannel || settings.requiredChannel || config.REQUIRED_CHANNEL_NAME || '@AutosVerify';
    const groupName = apiKeys.requiredGroup || settings.requiredGroup || config.REQUIRED_GROUP_NAME || '@AutosVerifyCh';

    // Determine what's missing and what's joined
    const missingItems = [];
    const joinedItems = [];

    if (!membership.channel) {
        missingItems.push({ label: '📢 Channel', name: channelName });
    } else {
        joinedItems.push({ label: '📢 Channel', name: channelName });
    }

    if (!membership.group) {
        missingItems.push({ label: '💬 Group', name: groupName });
    } else {
        joinedItems.push({ label: '💬 Group', name: groupName });
    }

    // Build message
    let msg = `🚫 *Access Restricted!*\n\n`;

    if (missingItems.length === 1 && joinedItems.length === 1) {
        // One missing, one joined - show which one they left
        const missing = missingItems[0];
        const joined = joinedItems[0];

        msg += `You left our ${missing.label} and your access has been *revoked*.\n\n`;
        msg += `Please rejoin to continue using the bot:\n\n`;
        msg += `✅ ${joined.label}: \`${joined.name}\` *(Already joined)*\n`;
        msg += `❌ ${missing.label}: \`${missing.name}\` *(Missing)*`;
    } else if (missingItems.length === 1) {
        // Only one item configured, and it's missing
        const item = missingItems[0];
        if (isFirstTime) {
            msg += `To use this bot, you need to join our ${item.label}.\n\n`;
            msg += `Please join to continue:\n\n`;
        } else {
            msg += `You left our ${item.label} and your access has been *revoked*.\n\n`;
            msg += `Please rejoin to continue using the bot:\n\n`;
        }
        msg += `❌ ${item.label}: \`${item.name}\``;
    } else if (missingItems.length === 2) {
        // Both missing
        if (isFirstTime) {
            msg += `To use this bot, you need to join our communities.\n\n`;
            msg += `Please join both to continue:\n\n`;
        } else {
            msg += `You are not a member of our required communities.\n\n`;
            msg += `Please join to use the bot:\n\n`;
        }
        missingItems.forEach(item => {
            msg += `❌ ${item.label}: \`${item.name}\`\n`;
        });
    }
    msg += `\n\n✅ After joining, click *Verify* below.`;

    // Build join buttons - only show buttons for missing items
    const buttons = [];

    // Add join buttons for missing items only
    missingItems.forEach(item => {
        let url = item.name;
        if (!url.startsWith('http')) {
            url = `https://t.me/${url.replace('@', '')}`;
        }
        buttons.push([{
            text: `Join ${item.label} ↗`,
            url: url
        }]);
    });

    // Add verify button
    buttons.push([{ text: '✅ Verify Membership', callback_data: 'verify_membership' }]);

    const opts = {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
    };

    if (msgId) {
        // Try to edit existing message
        bot.editMessageText(msg, { chat_id: chatId, message_id: msgId, ...opts })
            .then(() => console.log(`[JOIN] Updated message ${msgId} for ${chatId}`))
            .catch((e) => {
                console.log(`[JOIN] Could not edit message ${msgId}: ${e.message}`);
                // Don't send new message - just log error
            });
    } else {
        bot.sendMessage(chatId, msg, opts)
            .then((sent) => console.log(`[JOIN] Sent new message ${sent.message_id} to ${chatId}`))
            .catch(e => console.error('Mandatory Join Msg Error:', e));
    }
}

// Global Logger Override 
let currentChatId = null;
const originalEmitLog = global.emitLog;

global.emitLog = (message, type = 'info') => {
    if (currentChatId) {
        if ((message.includes('Step') || message.includes('Success') || message.includes('Error') || message.includes('http')) && !message.includes('Reward')) {
            const emoji = type === 'error' ? '❌' : 'ℹ️';
            bot.sendMessage(currentChatId, `${emoji} ${message}`);
        }
    }
    console.log(`[BOT] ${message}`);
    if (originalEmitLog) originalEmitLog(message, type);
};

// ================= COMMAND HANDLERS =================

console.log('[BOT] Registering command handlers...');

// Debug: Log bot info on startup
bot.getMe().then(botInfo => {
    console.log(`[BOT] Bot initialized: @${botInfo.username} (ID: ${botInfo.id})`);
}).catch(err => {
    console.error('[BOT] Failed to get bot info:', err.message);
});

// /start
const startThrottle = new Map();
const startChatSendLock = new Map();
bot.onText(/\/start/, async (msg) => {
    console.log(`[BOT] /start command received from ${msg.from?.id}`);
    const chatId = msg.chat.id;
    try {
        const userId = msg.from.id;

        // Anti-duplicate protection for start command
        const now = Date.now();
        const lastStart = startThrottle.get(userId) || 0;
        if (now - lastStart < 5000) {
            console.log(`[DEBUG] Blocked duplicate /start from ${userId}`);
            return;
        }
        startThrottle.set(userId, now);

        // Extra guard: sometimes Telegram delivers updates twice; block duplicate sends per chat
        const lastChatSend = startChatSendLock.get(chatId) || 0;
        if (now - lastChatSend < 5000) {
            console.log(`[DEBUG] Blocked duplicate /start send to chat ${chatId}`);
            return;
        }
        startChatSendLock.set(chatId, now);

        const username = msg.from.username || msg.from.first_name || 'Unknown';

        // Ensure user exists in database
        let user = db.getUser(userId);
        if (!user) {
            console.log(`[DEBUG] Creating new user: ${userId}`);
            user = db.getUser(userId); // This should create the user
        }

        // ===== BAN CHECK — Block banned users immediately with caching =====
        if (db.isBanned(userId)) {
            const banMsg = `🚫 *Account Banned*\n\n` +
                `Your Telegram ID \`${userId}\` has been banned from this service.\n\n` +
                `❌ *Reason:* Violation of terms of service.\n\n` +
                `If you believe this is a mistake, contact support via the channel.`;
            try {
                await bot.sendMessage(chatId, banMsg, { parse_mode: 'Markdown' });
            } catch (e) {}
            console.log(`[BAN] Blocked banned user ${userId} from /start`);
            return; // Stop all further processing
        }

        // Log user activity
        console.log(`👤 User: ${userId} (${username}) | 🚀 Started bot | ⏰ ${new Date().toLocaleTimeString()}`);

        // Referral Logic (Pending Verification)
        const refMatch = msg.text.split(' ')[1];

        // ── Bot Hosting: handle upload_bot start param ────────────────────
        if (refMatch === 'upload_bot') {
            // Set pending upload state for this user
            if (!db.data.botHosting) db.data.botHosting = { bots: {}, servers: [], pendingUploads: {} };
            if (!db.data.botHosting.pendingUploads) db.data.botHosting.pendingUploads = {};
            db.data.botHosting.pendingUploads[String(userId)] = { createdAt: Date.now(), file: null };
            db.save();

            await bot.sendMessage(chatId,
                `🤖 *Bot Hosting — File Upload*\n\n` +
                `Ready to receive your bot file!\n\n` +
                `📎 *Send your bot script file now*\n` +
                `Supported: \`.py\` \`.js\` \`.ts\` \`.php\` \`.rb\` \`.go\` \`.sh\` \`.zip\`\n` +
                `Max size: 10MB\n\n` +
                `After sending, go back to the *Bot Hosting* page and tap **✅ Check File**`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        // ── End Bot Hosting handler ───────────────────────────────────────
        if (refMatch) {
            const refCode = String(refMatch).trim();
            // Check if it's a valid referral code format (ref_XXXXXX or numeric userId)
            if (refCode !== String(userId)) {
                // Store pending referrer if not already referred
                if (!user.referredBy && !user.pendingReferrer) {
                    user.pendingReferrer = refCode; // Store the full code
                    db.updateUser(user);

                    // Immediately create pending referral record
                    db.handleReferral(userId, refCode);
                }
            }
        }

        // Check mandatory membership
        let membership = { channel: true, group: true };
        try {
            membership = await checkMembership(userId);
        } catch (membershipError) {
            console.error('[ERROR] checkMembership failed:', membershipError.message);
            // ✅ FIX: On error, assume not joined to show join screen
            membership = { channel: false, group: false, error: membershipError.message };
        }

        console.log(`[DEBUG] Membership check result: ${JSON.stringify(membership)}`);

        // ✅ FIX: Check if join is required from feature flags
        const joinRequired = !shouldSkipMembershipCheck();

        if (joinRequired && (!membership.channel || !membership.group)) {
            // User not joined, show mandatory join screen (first time)

            // Remove lingering keyboard if it exists
            const cleanupMsg = await bot.sendMessage(chatId, "⏳ Initializing...", { reply_markup: { remove_keyboard: true } });
            bot.deleteMessage(chatId, cleanupMsg.message_id).catch(() => { });

            showMandatoryJoin(chatId, membership, null, true);
            return;
        }

        // PROCESS PENDING REFERRAL - If user is already a member and has a pending referrer
        if (user.pendingReferrer) {
            db.verifyReferral(userId);
            user.pendingReferrer = null;
            
            // ===== WEEKLY LEADERBOARD TRACKING =====
            // Record the referral in weekly and monthly leaderboards
            const referrer = db.getUser(user.referredBy);
            if (referrer) {
                db.recordWeeklyReferral(user.referredBy);
                db.recordMonthlyReferral(user.referredBy);
                console.log(`[REFERRAL] Recorded in leaderboards - Weekly & Monthly`);
            }
            
            db.updateUser(user);
            console.log(`[REFERRAL] Auto-verified referral for user ${userId} on start (already member)`);
        }

        // ✅ FIX: Mark user as verified if they passed membership check
        if (user && !user.verified) {
            user.verified = true;
            db.updateUser(user);
        }

        // Cleanup old persistent keyboards before sending the menu
        const cleanupMsg2 = await bot.sendMessage(chatId, "⏳ Initializing...", { reply_markup: { remove_keyboard: true } });
        bot.deleteMessage(chatId, cleanupMsg2.message_id).catch(() => { });

        // User is member, show main menu
        await sendMainMenu(chatId, user, msg.from);
    } catch (e) {
        console.error('Error handling /start:', e);
        bot.sendMessage(chatId, `❌ Bot error: ${e.message || 'Please try again in a moment.'}`).catch(() => { });
    }
});

// /api
bot.onText(/\/api/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = db.getUser(userId);

    if (!user) return bot.sendMessage(chatId, "❌ User not found. Please /start first.");

    if (user.apiStatus === 'ban') {
        return bot.sendMessage(chatId, "🚫 **Access Denied**\n\nYour API access has been restricted.", { parse_mode: 'Markdown' });
    }

    if (!user.apiKey) {
        return bot.sendMessage(chatId, 
            "🔑 **API Access**\n\nYou haven't generated an API key yet.\n\nPlease open the **Mini App > Profile > API Access** to generate your key.", 
            { 
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{ text: '🚀 Open Mini App', web_app: { url: config.PUBLIC_URL } }]]
                }
            }
        );
    }

    const msgText = 
        `🔑 **Your API Access**\n\n` +
        `👤 **User ID:** \`${userId}\`\n` +
        `🔐 **API Key:** \`${user.apiKey}\`\n\n` +
        `⚠️ **Security Warning:**\n` +
        `Do not share this key with anyone. It gives full access to your account balances and services via API.`;

    bot.sendMessage(chatId, msgText, { 
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔄 Regenerate in App', web_app: { url: config.PUBLIC_URL } }],
                [{ text: '📚 API Documentation', url: 'https://docs.autosverify.com' }] // Placeholder
            ]
        }
    });
});

// /admin command - Admin Panel Access
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name || 'Unknown';

    // Check if user is admin
    if (!isAdmin(userId)) {
        // Silently ignore non-admins - do not reply to their comments/commands
        return;
    }

    const publicUrl = (process.env.PUBLIC_URL || `http://localhost:3000`).trim();
    const adminUrl = `${publicUrl}/admin`;

    const adminText = `👑 *Admin Panel Access*\n\n` +
        `Hello Admin *${username}*!\n\n` +
        `🚀 *Launch Admin Panel to:*\n` +
        `• Manage users & balances\n` +
        `• Add/remove accounts\n` +
        `• View analytics & stats\n` +
        `• Broadcast messages\n` +
        `• Configure settings\n\n` +
        `*Admin ID:* \`${userId}\``;

    const adminKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 Open Admin Panel', web_app: { url: adminUrl } }]
            ]
        }
    };

    try {
        await bot.sendMessage(chatId, adminText, { parse_mode: 'Markdown', ...adminKeyboard });
        console.log(`[ADMIN] Admin ${username} (${userId}) accessed admin panel`);
    } catch (e) {
        console.error('Error sending admin panel:', e);
        bot.sendMessage(chatId, "❌ Error opening admin panel. Please try again.");
    }
});

// --- ADMIN SESSION & LIVE AUDIO STREAMING CONTROL ---
const presetSongs = [
    { name: 'Islamic Nasheed (ইসলামিক গজল)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { name: 'Lofi Beats Chill (লোফি মিউজিক)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { name: 'Relaxing Ambient Stream', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { name: 'Upbeat BG Track (ব্যাকগ্রাউন্ড)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' }
];

async function sendAdminSessionMenu(chatId, messageId) {
    if (!db.data) db.data = {};
    if (!db.data.liveAudio) {
        db.data.liveAudio = {
            status: 'Offline',
            currentMusic: 'None',
            volume: 80,
            customLink: null,
            activePlaylist: 'Default'
        };
    }
    const state = db.data.liveAudio;

    const statusEmoji = state.status === 'Connected' ? '🟢 Active & Streaming' : (state.status === 'Joining...' ? '🟡 Connecting...' : '🔴 Offline');
    const musicEmoji = state.currentMusic !== 'None' ? `🎵 Playing: ${state.currentMusic}` : '🔇 Muted/Paused';

    const msgText = `🎙️ **Admin Session — Live Stream Protection & Audio Control**\n` +
        `──────────────────────────────────\n` +
        `Hello Admin! You can fully manage the Live Stream Assistant directly from here.\n\n` +
        `📡 **Assistant Status:** ${statusEmoji}\n` +
        `🎵 **Music Playback:** ${musicEmoji}\n` +
        `🎚️ **Playback Volume:** \`${state.volume}%\`\n` +
        `📋 **Active Playlist:** \`${state.activePlaylist}\`\n\n` +
        `*Choose an action below to control the Assistant:*`;

    const publicUrl = (process.env.PUBLIC_URL || `http://localhost:3000`).trim();
    const adminUrl = `${publicUrl}/admin`;

    const inlineKeyboard = [
        [
            { text: '🎙️ Join Stream (জয়েন)', callback_data: 'admin_join_voice' },
            { text: '🛑 Leave (লিভ নিন)', callback_data: 'admin_leave_voice' }
        ],
        [
            { text: '▶️ Play (গান চালান)', callback_data: 'admin_play_music' },
            { text: '⏸️ Stop/Pause (গান বন্ধ)', callback_data: 'admin_stop_music' }
        ],
        [
            { text: '🔈 Vol 20%', callback_data: 'admin_vol_20' },
            { text: '🔉 Vol 50%', callback_data: 'admin_vol_50' },
            { text: '🔊 Vol 80%', callback_data: 'admin_vol_80' },
            { text: '⚡ Vol 100%', callback_data: 'admin_vol_100' }
        ],
        [
            { text: '📺 Play Custom Link (কাস্টম গান)', callback_data: 'admin_custom_link' }
        ],
        [
            { text: '📜 Select Playlist (প্লেলিস্ট)', callback_data: 'admin_playlist' }
        ],
        [
            { text: '🌐 Web Admin Panel (ওয়েব প্যানেল)', web_app: { url: adminUrl } }
        ],
        [
            { text: '🔙 Back to Main Menu', callback_data: 'main_menu' }
        ]
    ];

    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    };

    try {
        if (messageId) {
            await bot.editMessageText(msgText, { chat_id: chatId, message_id: messageId, ...options });
        } else {
            await bot.sendMessage(chatId, msgText, options);
        }
    } catch (e) {
        console.error('Error sending Admin Session Menu:', e.message);
        await bot.sendMessage(chatId, msgText, options).catch(() => {});
    }
}

async function sendAdminPlaylistMenu(chatId, messageId) {
    let msgText = `📜 **Admin Playlist Selection (প্লেলিস্ট নির্বাচন করুন)**\n` +
        `──────────────────────────────────\n` +
        `Select any of the preset music streams to play in the voice chat:\n\n`;

    presetSongs.forEach((song, idx) => {
        msgText += `${idx + 1}. 🎵 **${song.name}**\n`;
    });

    msgText += `\n*Click a button below to select and start playing:*`;

    const inlineKeyboard = [];
    presetSongs.forEach((song, idx) => {
        inlineKeyboard.push([{ text: `🎵 ${song.name.split(' (')[0]}`, callback_data: `admin_select_song_${idx}` }]);
    });

    inlineKeyboard.push([{ text: '🔙 Back to Admin Session', callback_data: 'admin_session_menu' }]);

    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    };

    if (messageId) {
        await bot.editMessageText(msgText, { chat_id: chatId, message_id: messageId, ...options });
    } else {
        await bot.sendMessage(chatId, msgText, options);
    }
}

// Handler for text commands (join, play, stop, volume, playlist) from Admins
bot.on('message', async (msg) => {
    if (!msg.from || !msg.text) return;
    const userId = msg.from.id;
    const chatId = msg.chat.id;

    // We only process admin commands in private chat
    if (msg.chat.type !== 'private' || !isAdmin(userId)) return;

    const text = msg.text.trim().toLowerCase();

    // Initialize state
    if (!db.data.liveAudio) {
        db.data.liveAudio = {
            status: 'Offline',
            currentMusic: 'None',
            volume: 80,
            customLink: null,
            activePlaylist: 'Default'
        };
    }

    // 1. Handle awaiting custom music link state
    if (userState[userId] && userState[userId].state === 'awaiting_custom_music_link') {
        if (text === '/cancel' || text === 'cancel') {
            delete userState[userId];
            await bot.sendMessage(chatId, '❌ Custom music play cancelled.');
            await sendAdminSessionMenu(chatId);
            return;
        }

        const isUrl = text.startsWith('http://') || text.startsWith('https://');
        if (!isUrl && text.length < 10) {
            await bot.sendMessage(chatId, '⚠️ Please provide a valid YouTube / audio streaming link (starts with http/https).');
            return;
        }

        db.data.liveAudio.status = 'Connected';
        db.data.liveAudio.currentMusic = msg.text; // Store exact user text as the name
        db.data.liveAudio.customLink = msg.text;
        db.save();

        delete userState[userId];

        await bot.sendMessage(chatId, `✅ **Playing Custom Music Stream!**\n\n🔗 URL: \`${msg.text}\`\n🎙️ Assistant has joined the live stream and started playback at \`${db.data.liveAudio.volume}%\` volume.`);
        await sendAdminSessionMenu(chatId);
        return;
    }

    // 2. Process text-based commands
    if (text === 'join' || text === '/join') {
        db.data.liveAudio.status = 'Connected';
        db.save();
        await bot.sendMessage(chatId, '🎙️ **Assistant Joined Stream!**\n\nThe assistant account has joined the live stream and voice chat successfully.');
        await sendAdminSessionMenu(chatId);
    } 
    else if (text === 'stop' || text === '/stop') {
        db.data.liveAudio.currentMusic = 'None';
        db.save();
        await bot.sendMessage(chatId, '⏸️ **Audio Playback Stopped!**\n\nMusic streaming has been paused.');
        await sendAdminSessionMenu(chatId);
    } 
    else if (text.startsWith('play ') || text.startsWith('/play ')) {
        const urlArg = msg.text.slice(msg.text.indexOf(' ') + 1).trim();
        db.data.liveAudio.status = 'Connected';
        db.data.liveAudio.currentMusic = urlArg;
        db.data.liveAudio.customLink = urlArg;
        db.save();
        await bot.sendMessage(chatId, `✅ **Playing custom song:** \`${urlArg}\``);
        await sendAdminSessionMenu(chatId);
    } 
    else if (text === 'play' || text === '/play') {
        db.data.liveAudio.status = 'Connected';
        db.data.liveAudio.currentMusic = presetSongs[0].name;
        db.save();
        await bot.sendMessage(chatId, `✅ **Playing default stream:** \`${presetSongs[0].name}\``);
        await sendAdminSessionMenu(chatId);
    } 
    else if (text.startsWith('volume ') || text.startsWith('/volume ')) {
        const volArg = parseInt(text.replace('volume', '').replace('/', '').trim());
        if (!isNaN(volArg) && volArg >= 0 && volArg <= 100) {
            db.data.liveAudio.volume = volArg;
            db.save();
            await bot.sendMessage(chatId, `🔊 **Volume updated to:** \`${volArg}%\``);
            await sendAdminSessionMenu(chatId);
        } else {
            await bot.sendMessage(chatId, '⚠️ Volume must be a number between 0 and 100.');
        }
    } 
    else if (text === 'playlist' || text === '/playlist') {
        await sendAdminPlaylistMenu(chatId);
    }
});
async function sendMainMenu(chatId, user, msgFrom) {
    // Get settings from database (admin panel configured)
    const settings = db.getSettings ? db.getSettings() : (db.data.settings || {});
    const apiKeys = db.data?.apiKeys || {};

    // Use admin panel configured URLs or fallbacks
    const miniAppUrl = (apiKeys.miniAppUrl || settings.miniAppUrl || process.env.PUBLIC_URL || `http://localhost:3000`).trim();
    const requiredChannel = apiKeys.requiredChannel || settings.requiredChannel || config.REQUIRED_CHANNEL || '@AutosVerify';
    const requiredGroup = apiKeys.requiredGroup || settings.requiredGroup || config.REQUIRED_GROUP || '@AutosVerifyCh';
    const requiredYoutube = apiKeys.requiredYoutube || settings.requiredYoutube || 'https://youtube.com/@MamunIslamyts';

    // Get fresh name from Telegram message context if available, else use stored
    const firstName = (msgFrom && msgFrom.first_name) ? msgFrom.first_name :
        (user.firstName || user.first_name || 'Friend');

    // Welcome message - can be customized via admin panel
    let welcomeText = apiKeys.welcomeMessage ||
        `👋 *Hello, ${firstName}!*\n\n` +
        `Welcome to Gemini Verified! 🚀\n\n` +
        `Launch our Mini App to start earning rewards, invite friends, and manage your assets.`;

    // Replace {name} placeholder if present in custom message
    welcomeText = welcomeText.replace(/{name}/g, firstName);

    // Auto Folder link (admin configurable)
    const autoFolderLink = apiKeys.autoFolderLink || settings.autoFolderLink || null;

    // Keyboard with admin-configurable links
    let channelUrl = requiredChannel;
    if (!channelUrl.startsWith('http')) {
        channelUrl = `https://t.me/${channelUrl.replace('@', '')}`;
    }
    let groupUrl = requiredGroup;
    if (!groupUrl.startsWith('http')) {
        groupUrl = `https://t.me/${groupUrl.replace('@', '')}`;
    }

    const inlineRows = [
        [{ text: '🚀 Launch App', web_app: { url: miniAppUrl } }]
    ];

    if (isAdmin(chatId)) {
        inlineRows.push([{ text: '🛠️ Admin Session (এডমিন সেকশন)', callback_data: 'admin_session_menu' }]);
    }

    inlineRows.push([
        { text: '🔑 API Access', callback_data: 'api_key' },
        { text: '📊 Profile', web_app: { url: miniAppUrl + '?page=profile' } }
    ]);
    inlineRows.push([{ text: '📢 Join Channel', url: channelUrl }]);
    inlineRows.push([{ text: '👥 Join Group', url: groupUrl }]);
    inlineRows.push([{ text: '📺 YouTube Channel', url: requiredYoutube }]);

    // If auto folder link is configured, ADD it as first button after Launch App
    // and REPLACE the "API Access" button row with "Add Auto Folder"
    if (autoFolderLink) {
        // Find index of the API Access / Profile row and replace it
        const rowIdx = isAdmin(chatId) ? 2 : 1;
        inlineRows[rowIdx] = [{
            text: '📁 Add Auto Folder — Join all at once!',
            url: autoFolderLink
        }];
    }

    const keyboard = {
        reply_markup: {
            inline_keyboard: inlineRows
        }
    };

    try {
        await bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown', ...keyboard });
    } catch (e) {
        console.error('Error sending main menu:', e);
    }
}

// Debounce Maps
const callbackThrottle = new Map();
const messageThrottle = new Map();

// Track Group Memberships & User Activity
bot.on('my_chat_member', (update) => {
    const chat = update.chat;
    const newStatus = update.new_chat_member.status;

    if (['member', 'administrator'].includes(newStatus)) {
        // Bot added to group/channel - Fetch member count
        const fetchCount = typeof bot.getChatMemberCount === 'function' ? bot.getChatMemberCount.bind(bot) : bot.getChatMembersCount.bind(bot);
        fetchCount(chat.id).then(count => {
            db.saveGroup(chat.id, chat.title, chat.type, count || 0);
            console.log(`[GROUP] Added to ${chat.type}: ${chat.title} (${chat.id}) - Members: ${count || 'unknown'}`);
        }).catch(err => {
            db.saveGroup(chat.id, chat.title, chat.type, 0);
            console.log(`[GROUP] Added to ${chat.type}: ${chat.title} (${chat.id}) [member count: error]`);
        });

        // Notify Admin of new group/channel ID
        if (config.ADMIN_ID) {
            bot.sendMessage(config.ADMIN_ID, `🤖 **Bot Added to New ${chat.type.toUpperCase()}**\n\n📌 **Title:** ${chat.title}\n🆔 **Chat ID:** \`${chat.id}\`\n\n_Use this ID in config.js if you want to set it as a backup chat._`, { parse_mode: 'Markdown' }).catch(() => { });
        }
    } else if (['left', 'kicked'].includes(newStatus)) {
        // Bot removed
        if (db.data.groups && db.data.groups[chat.id]) {
            delete db.data.groups[chat.id];
            db.save();
            console.log(`[GROUP] Removed from ${chat.type}: ${chat.title} (${chat.id})`);
        }
    }
});

// Update User Activity on Message (Any Type)
bot.on('message', async (msg) => {
    if (msg.from && msg.from.id) db.updateUserActivity(msg.from.id);
    
    // Strict Membership Check for Private Chats
    if (msg.chat && msg.chat.type === 'private' && (!msg.text || !msg.text.startsWith('/start'))) {
        const userId = msg.from.id;
        const user = db.getUser(userId);
        
        const settings = db.getSettings ? db.getSettings() : {};
        const joinRequired = settings.joinRequired !== undefined ? settings.joinRequired : true;
        
        if (joinRequired && (!user || !user.verified)) {
            const membership = await checkMembership(userId);
            if (!membership.channel || !membership.group) {
                showMandatoryJoin(userId, membership);
                return; // Stop processing further
            } else if (user) {
                user.verified = true;
                user.verifiedAt = new Date().toISOString();
                db.updateUser(user);
            }
        }
    }

    if (['group', 'supergroup', 'channel'].includes(msg.chat.type)) {
        db.saveGroup(msg.chat.id, msg.chat.title, msg.chat.type);
    }

    // ===== CHAT REWARD DISABLED =====
    // Chat reward system is disabled to prevent users from gaming the system
    // Users should earn tokens through official channels: deposits, gift claims, etc.
    // Uncomment the code below if you want to re-enable chat rewards
    /*
    const requiredGroup = String(config.REQUIRED_GROUP || '').toLowerCase();
    const chatUsername = (msg.chat && msg.chat.username) ? '@' + msg.chat.username.toLowerCase() : '';
    const chatId = String(msg.chat.id);

    if ((chatUsername === requiredGroup || chatId === requiredGroup) && msg.from && !msg.from.is_bot) {
        const userId = msg.from.id;
        const user = db.getUser(userId);
        if (user) {
            const reward = 5;
            db.setTokenBalance(user, db.getTokenBalance(user) + reward);
            if (!user.history) user.history = [];
            user.history.unshift({
                type: 'chat_reward',
                amount: reward,
                currency: 'tokens',
                date: Date.now(),
                detail: 'Message reward'
            });
            db.updateUser(user);
            console.log(`[REWARD] User ${userId} earned 5 tokens for chatting in group.`);
        }
    }
    */
});

// ==================== GROUP MANAGEMENT: AUTO-DELETE SYSTEM MESSAGES ====================
// Auto-delete join/leave messages and other system messages in groups
bot.on('message', async (msg) => {
    // Only process group messages (not channels)
    if (!msg.chat || !['group', 'supergroup'].includes(msg.chat.type)) return;

    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    // Trigger auto-unmute schedule for active chatters
    if (msg.from && !msg.from.is_bot) {
        scheduleAutoUnmute(chatId, msg.from);
    }

    // Get group management settings
    const settings = db.data?.adminSettings?.groupManagement || {};

    // IMPORTANT: Never delete messages from admins, creators, or channel posts
    if (msg.sender_chat) return; // Channel-linked post
    if (msg.forward_from_chat) return; // Forwarded from channel

    // For user messages — check if system message first (system messages have no msg.from typically)
    // Only check admin status if msg.from exists (system messages won't have from)
    if (msg.from && !msg.from.is_bot) {
        try {
            const member = await bot.getChatMember(chatId, msg.from.id);
            if (['administrator', 'creator'].includes(member.status)) return;
        } catch (e) { /* ignore — proceed with system message checks */ }
    }

    // Check if this is a system message that should be deleted
    let shouldDelete = false;
    let deleteReason = '';

    // Check for new chat members (join messages)
    if (msg.new_chat_members && msg.new_chat_members.length > 0) {
        // Welcome new members if welcomeMessage is enabled in admin settings
        const welcomeEnabled = settings.welcomeMessage === true;

        for (const newMember of msg.new_chat_members) {
            if (newMember.is_bot) continue;

            // Auto unmute the new member after 1 minute
            scheduleAutoUnmute(chatId, newMember);

            if (welcomeEnabled) {
                const memberName = newMember.first_name || 'New Member';
                const groupTitle = msg.chat.title || 'our group';
                const customText = settings.welcomeMessageText || '';
                const botUsername = db.data?.settings?.botUsername || 'YourBot';

                // Use admin-configured message with {name}/{username}/{title} placeholders
                const welcomeText = customText
                    ? customText
                        .replace(/\{name\}/g, memberName)
                        .replace(/\{username\}/g, newMember.username ? `@${newMember.username}` : memberName)
                        .replace(/\{title\}/g, groupTitle)
                    : `👋 Welcome ${memberName} to ${groupTitle}!\n\n🎉 We're glad to have you here. Use the bot to access all services!`;

                try {
                    const sentMsg = await bot.sendMessage(chatId, welcomeText, {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '🚀 Open Bot', url: `https://t.me/${botUsername}?start=welcome` }
                            ]]
                        }
                    });
                    console.log(`[WELCOME] Sent to ${memberName} (${newMember.id})`);
                    // Auto-delete after 2 minutes
                    setTimeout(() => { bot.deleteMessage(chatId, sentMsg.message_id).catch(() => {}); }, 120000);
                } catch (e) {
                    console.log(`[WELCOME] Failed: ${e.message}`);
                }
            }
        }

        if (settings.deleteJoinMessages !== false) {
            shouldDelete = true;
            deleteReason = 'join';
        }
    }

    // Check for left chat member (leave messages)
    if (msg.left_chat_member) {
        if (settings.deleteLeaveMessages !== false) {
            shouldDelete = true;
            deleteReason = 'leave';
        }
    }

    // Check for pinned message
    if (msg.pinned_message) {
        if (settings.deletePinMessages !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'pin';
        }
    }

    // Check for voice chat started
    if (msg.voice_chat_started) {
        if (settings.deleteVoiceChatStarted !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'voice_chat_started';
        }
    }

    // Check for voice chat ended
    if (msg.voice_chat_ended) {
        if (settings.deleteVoiceChatEnded !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'voice_chat_ended';
        }
    }

    // Check for video chat started
    if (msg.video_chat_started) {
        if (settings.deleteVideoChatStarted !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'video_chat_started';
        }
        
        // Auto-join live stream feature (Requested by user)
        // Note: Standard Bots cannot join voice/video chats or unmute users.
        // This requires a Userbot (MTProto API).
        if (settings.autoJoinLiveStream !== false) {
            console.log(`[LIVE-STREAM] Video chat started in ${chatId}. Bot cannot join directly via Bot API. Requires Userbot.`);
            // Placeholder for future implementation if a userbot is integrated
        }
    }

    // Check for video chat ended
    if (msg.video_chat_ended) {
        if (settings.deleteVideoChatEnded !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'video_chat_ended';
        }
    }

    // Check for video chat scheduled
    if (msg.video_chat_scheduled) {
        if (settings.deleteVideoChatScheduled !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'video_chat_scheduled';
        }
    }

    // Check for video chat participants invited
    if (msg.video_chat_participants_invited) {
        if (msg.video_chat_participants_invited.users) {
            for (const u of msg.video_chat_participants_invited.users) {
                scheduleAutoUnmute(chatId, u);
            }
        }
        if (settings.deleteVideoChatParticipantsInvited !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'video_chat_participants_invited';
        }
    }

    // Check for proximity alert triggered
    if (msg.proximity_alert_triggered) {
        if (settings.deleteProximityAlertTriggered !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'proximity_alert';
        }
    }

    // Check for auto delete timer changed
    if (msg.message_auto_delete_timer_changed) {
        if (settings.deleteAutoDeleteTimerChanged !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'auto_delete_timer';
        }
    }

    // Check for migrate to chat
    if (msg.migrate_to_chat_id) {
        if (settings.deleteMigrateToChat !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'migrate';
        }
    }

    // Check for migrate from chat
    if (msg.migrate_from_chat_id) {
        if (settings.deleteMigrateFromChat !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'migrate';
        }
    }

    // Check for channel chat created
    if (msg.channel_chat_created) {
        if (settings.deleteChannelChatCreated !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'channel_created';
        }
    }

    // Check for supergroup chat created
    if (msg.supergroup_chat_created) {
        if (settings.deleteSupergroupChatCreated !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'supergroup_created';
        }
    }

    // Check for delete chat photo
    if (msg.delete_chat_photo) {
        if (settings.deleteDeleteGroupPhoto !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'photo_deleted';
        }
    }

    // Check for group photo changed
    if (msg.new_chat_photo && msg.new_chat_photo.length > 0) {
        if (settings.deleteGroupPhotoChanged !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'photo_changed';
        }
    }

    // Check for group title changed
    if (msg.new_chat_title) {
        if (settings.deleteTitleChanged !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'title_changed';
        }
    }

    // Check for group description changed (handled in new_chat_description or edited message)
    // Check for forum topic related messages
    if (msg.forum_topic_created) {
        if (settings.deleteForumTopicCreated !== false) { // Default true
            shouldDelete = true;
            deleteReason = 'forum_topic_created';
        }
    }

    if (msg.forum_topic_edited) {
        if (settings.deleteForumTopicEdited === true) { // Default: OFF
            shouldDelete = true;
            deleteReason = 'forum_topic_edited';
        }
    }

    if (msg.forum_topic_closed) {
        if (settings.deleteForumTopicClosed === true) { // Default: OFF
            shouldDelete = true;
            deleteReason = 'forum_topic_closed';
        }
    }

    if (msg.forum_topic_reopened) {
        if (settings.deleteForumTopicReopened === true) { // Default: OFF
            shouldDelete = true;
            deleteReason = 'forum_topic_reopened';
        }
    }

    if (msg.general_forum_topic_hidden) {
        if (settings.deleteGeneralForumTopicHidden === true) { // Default: OFF
            shouldDelete = true;
            deleteReason = 'forum_topic_hidden';
        }
    }

    if (msg.general_forum_topic_unhidden) {
        if (settings.deleteGeneralForumTopicUnhidden === true) { // Default: OFF
            shouldDelete = true;
            deleteReason = 'forum_topic_unhidden';
        }
    }

    // Giveaway/boost messages — only delete if explicitly enabled
    if (msg.giveaway_created) {
        if (settings.deleteGiveawayCreated === true) {
            shouldDelete = true;
            deleteReason = 'giveaway_created';
        }
    }

    if (msg.giveaway_winners) {
        if (settings.deleteGiveawayWinners === true) {
            shouldDelete = true;
            deleteReason = 'giveaway_winners';
        }
    }

    if (msg.giveaway_completed) {
        if (settings.deleteGiveawayCompleted === true) {
            shouldDelete = true;
            deleteReason = 'giveaway_completed';
        }
    }

    // Boost added — only delete if explicitly enabled
    if (msg.boost_added) {
        if (settings.deleteBoostAdded === true) {
            shouldDelete = true;
            deleteReason = 'boost_added';
        }
    }

    // Background set — only delete if explicitly enabled
    if (msg.chat_background_set) {
        if (settings.deleteChatBackgroundSet === true) {
            shouldDelete = true;
            deleteReason = 'background_set';
        }
    }

    // If message should be deleted, delete it
    if (shouldDelete) {
        try {
            await bot.deleteMessage(chatId, messageId);
            db.incrementDeletedMessages();
            console.log(`[GROUP-MGMT] Deleted ${deleteReason} message in chat ${chatId}`);
        } catch (e) {
            // Silently fail - bot might not have permission to delete
            console.log(`[GROUP-MGMT] Failed to delete ${deleteReason} message in chat ${chatId}: ${e.message}`);
        }
    }
}); // Fix: Close the group management handler here!

// ==================== CHANNEL SERVICE MESSAGE AUTO-DELETE ====================
// Auto-delete Telegram service messages in channels (live started/ended, pinned, auto-delete timer, etc.)
bot.on('channel_post', async (msg) => {
    if (!msg.chat || msg.chat.type !== 'channel') return;

    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    // Get group/channel management settings (shared settings)
    const settings = db.data?.adminSettings?.groupManagement || {};

    let shouldDelete = false;
    let deleteReason = '';

    // Pinned message notification
    if (msg.pinned_message) {
        if (settings.deletePinMessages !== false) {
            shouldDelete = true;
            deleteReason = 'channel_pin';
        }
    }

    // Voice chat started
    if (msg.voice_chat_started) {
        if (settings.deleteVoiceChatStarted !== false) {
            shouldDelete = true;
            deleteReason = 'channel_voice_chat_started';
        }
    }

    // Voice chat ended
    if (msg.voice_chat_ended) {
        if (settings.deleteVoiceChatEnded !== false) {
            shouldDelete = true;
            deleteReason = 'channel_voice_chat_ended';
        }
    }

    // Video chat (live stream) started
    if (msg.video_chat_started) {
        if (settings.deleteVideoChatStarted !== false) {
            shouldDelete = true;
            deleteReason = 'channel_video_chat_started';
        }
    }

    // Video chat (live stream) ended
    if (msg.video_chat_ended) {
        if (settings.deleteVideoChatEnded !== false) {
            shouldDelete = true;
            deleteReason = 'channel_video_chat_ended';
        }
    }

    // Video chat scheduled
    if (msg.video_chat_scheduled) {
        if (settings.deleteVideoChatScheduled !== false) {
            shouldDelete = true;
            deleteReason = 'channel_video_chat_scheduled';
        }
    }

    // Video chat participants invited
    if (msg.video_chat_participants_invited) {
        if (settings.deleteVideoChatParticipantsInvited !== false) {
            shouldDelete = true;
            deleteReason = 'channel_video_chat_participants_invited';
        }
    }

    // Auto-delete timer changed
    if (msg.message_auto_delete_timer_changed) {
        if (settings.deleteAutoDeleteTimerChanged !== false) {
            shouldDelete = true;
            deleteReason = 'channel_auto_delete_timer';
        }
    }

    // Channel photo changed
    if (msg.new_chat_photo && msg.new_chat_photo.length > 0) {
        if (settings.deleteGroupPhotoChanged !== false) {
            shouldDelete = true;
            deleteReason = 'channel_photo_changed';
        }
    }

    // Channel photo deleted
    if (msg.delete_chat_photo) {
        if (settings.deleteDeleteGroupPhoto !== false) {
            shouldDelete = true;
            deleteReason = 'channel_photo_deleted';
        }
    }

    // Channel title changed
    if (msg.new_chat_title) {
        if (settings.deleteTitleChanged !== false) {
            shouldDelete = true;
            deleteReason = 'channel_title_changed';
        }
    }

    // Migrate messages
    if (msg.migrate_to_chat_id || msg.migrate_from_chat_id) {
        if (settings.deleteMigrateToChat !== false) {
            shouldDelete = true;
            deleteReason = 'channel_migrate';
        }
    }

    // Giveaway created
    if (msg.giveaway_created) {
        if (settings.deleteGiveawayCreated === true) {
            shouldDelete = true;
            deleteReason = 'channel_giveaway_created';
        }
    }

    // Boost added
    if (msg.boost_added) {
        if (settings.deleteBoostAdded === true) {
            shouldDelete = true;
            deleteReason = 'channel_boost_added';
        }
    }

    // Chat background set
    if (msg.chat_background_set) {
        if (settings.deleteChatBackgroundSet === true) {
            shouldDelete = true;
            deleteReason = 'channel_background_set';
        }
    }

    if (shouldDelete) {
        try {
            await bot.deleteMessage(chatId, messageId);
            db.incrementDeletedMessages();
            console.log(`[CHANNEL-MGMT] Deleted ${deleteReason} message in channel ${chatId}`);
        } catch (e) {
            console.log(`[CHANNEL-MGMT] Failed to delete ${deleteReason} in channel ${chatId}: ${e.message}`);
        }
    }
});

// ==================== GROUP ANTI-LINK & MODERATION ====================
// Delete links posted by non-admins in groups, warn them, and redirect to bot
bot.on('message', async (msg) => {
    if (!msg.chat || !['group', 'supergroup'].includes(msg.chat.type)) return;
    if (!msg.text && !msg.caption) return;
    if (!msg.from || msg.from.is_bot) return;

    const chatId = msg.chat.id;
    const fromId = msg.from.id;
    const messageId = msg.message_id;
    const text = msg.text || msg.caption || '';

    // Skip channel-linked posts (automated forwards from linked channel)
    if (msg.sender_chat) return;
    // Skip forwarded messages from channels/chats
    if (msg.forward_from_chat) return;

    // Skip if user is admin/creator/moderator — NEVER touch their messages
    try {
        const member = await bot.getChatMember(chatId, fromId);
        if (['administrator', 'creator'].includes(member.status)) return;
    } catch (e) { return; }

    // Get group moderation settings
    const groupSettings = db.data?.adminSettings?.groupManagement || {};
    const antiLinkEnabled = groupSettings.antiLink !== false; // Default: ON
    const antiSpamEnabled = groupSettings.antiSpam !== false;  // Default: ON
    // Check for links (URLs, @mentions of external channels, t.me links)
    const linkPatterns = [
        /https?:\/\/[^\s]+/i,           // http/https links
        /t\.me\/[^\s]+/i,               // t.me links
        /telegram\.me\/[^\s]+/i,        // telegram.me links
        /joinchat\/[^\s]+/i,            // join chat links
        /\+[A-Za-z0-9_-]{10,}/          // invite links (+xxxxxxxx)
    ];

    const hasLink = antiLinkEnabled && linkPatterns.some(p => p.test(text));

    // Check for @mentions (external groups/channels only)
    const mentionPattern = /@[A-Za-z][A-Za-z0-9_]{4,}/g;
    const mentions = text.match(mentionPattern) || [];
    const ownBotUsername = db.data?.settings?.botUsername || '';
    const requiredChannel = (db.data?.apiKeys?.requiredChannel || '').replace('@', '');
    const requiredGroup = (db.data?.apiKeys?.requiredGroup || '').replace('@', '');

    const hasExternalMention = antiSpamEnabled && mentions.some(m => {
        const name = m.replace('@', '').toLowerCase();
        return name !== ownBotUsername.toLowerCase()
            && name !== requiredChannel.toLowerCase()
            && name !== requiredGroup.toLowerCase();
    });

    if (!hasLink && !hasExternalMention) return;

    // Delete the offending message
    try {
        await bot.deleteMessage(chatId, messageId);
        db.incrementDeletedMessages();
        console.log(`[ANTI-LINK] Deleted message from ${fromId} in ${chatId}`);
    } catch (e) {
        console.log(`[ANTI-LINK] Could not delete: ${e.message}`);
    }

    // 3-Strike Warning System
    const firstName = msg.from.first_name || 'User';
    const warningKey = `warn_${chatId}_${fromId}`;
    if (!db.data.groupWarnings) db.data.groupWarnings = {};
    const warns = db.data.groupWarnings[warningKey] || { count: 0, suspensions: 0 };
    warns.count++;
    warns.lastWarn = Date.now();
    db.data.groupWarnings[warningKey] = warns;
    db.save();

    let warningText = '';
    let shouldSuspend = false;
    let permanentBan = false;

    if (warns.count === 1) {
        warningText = `⚠️ *Warning 1/3* — ${firstName}\n\nLinks and external mentions are not allowed here!\nNext violation = 1 day mute.`;
    } else if (warns.count === 2) {
        warningText = `🔇 *Warning 2/3* — ${firstName}\n\nYou've been warned again! Muted for 24 hours.`;
        shouldSuspend = true;
    } else {
        warningText = `🚫 *Final Warning — Permanently Muted* — ${firstName}\n\nYou have violated the rules 3 times. You are permanently restricted.`;
        shouldSuspend = true;
        permanentBan = true;
        warns.suspensions = (warns.suspensions || 0) + 1;
        // If 3 separate day-suspensions accumulated → permanent
        if (warns.suspensions >= 3) permanentBan = true;
    }

    if (shouldSuspend) {
        try {
            const untilDate = permanentBan ? 0 : Math.floor(Date.now() / 1000) + 86400; // 0 = permanent, 86400 = 1 day
            await bot.restrictChatMember(chatId, fromId, {
                permissions: {
                    can_send_messages: false,
                    can_send_media_messages: false,
                    can_send_polls: false,
                    can_send_other_messages: false,
                    can_add_web_page_previews: false,
                    can_change_info: false,
                    can_invite_users: false,
                    can_pin_messages: false
                },
                until_date: untilDate
            });
            if (permanentBan) warns.count = 0; // reset after permanent
        } catch (e) {
            console.log(`[ANTI-LINK] Could not restrict user: ${e.message}`);
        }
    }

    const botUsername = db.data?.settings?.botUsername || 'AutosVerify_bot';
    try {
        const warnMsg = await bot.sendMessage(chatId, warningText, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '🚀 Open Bot', url: `https://t.me/${botUsername}?start=group` }
                ]]
            }
        });
        setTimeout(async () => {
            try { await bot.deleteMessage(chatId, warnMsg.message_id); } catch (e) {}
        }, 15000);
    } catch (e) {
        console.log(`[ANTI-LINK] Could not send warning: ${e.message}`);
    }
});

// ==================== AI GROUP MODERATOR ====================
// Uses configured AI (OpenAI-compatible) to moderate group messages
bot.on('message', async (msg) => {
    if (!msg.chat || !['group', 'supergroup'].includes(msg.chat.type)) return;
    if (!msg.text && !msg.caption) return;
    if (!msg.from || msg.from.is_bot) return;

    const chatId = msg.chat.id;
    const fromId = msg.from.id;
    const messageId = msg.message_id;
    const text = msg.text || msg.caption || '';

    // Check AI moderator is enabled
    const aiSettings = db.data?.adminSettings?.aiModerator || {};
    if (!aiSettings.enabled) return;
    if (!aiSettings.apiKey) return; // No API key configured

    // Skip channel-linked posts and channel forwards
    if (msg.sender_chat) return;
    if (msg.forward_from_chat) return;

    // Skip admins/creators/moderators — NEVER touch their messages
    try {
        const member = await bot.getChatMember(chatId, fromId);
        if (['administrator', 'creator'].includes(member.status)) return;
    } catch (e) { return; }

    // Skip bots
    if (msg.from.is_bot) return;

    // Use configured prompt or default
    const moderationPrompt = aiSettings.prompt ||
        'You are a strict group moderator. Detect and remove spam, promotional content, scam links, and suspicious messages. Reply only: SAFE or VIOLATES:<reason>';

    const model = aiSettings.model || 'gpt-4o-mini';
    const apiKey = aiSettings.apiKey;

    try {
        // Call OpenAI-compatible API
        const axios = require('axios');
        const apiBase = 'https://api.openai.com/v1/chat/completions';

        const response = await axios.post(apiBase, {
            model: model,
            messages: [
                { role: 'system', content: moderationPrompt },
                { role: 'user', content: `Message: "${text}"` }
            ],
            max_tokens: 100,
            temperature: 0
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 8000
        });

        const reply = (response.data?.choices?.[0]?.message?.content || '').trim().toUpperCase();

        if (reply.startsWith('VIOLATES')) {
            const reason = reply.replace('VIOLATES:', '').trim() || 'Spam/Promotion';

            // Delete the message
            if (aiSettings.deleteSpam !== false) {
                try {
                    await bot.deleteMessage(chatId, messageId);
                    db.incrementDeletedMessages();
                    console.log(`[AI MOD] Deleted message from ${fromId}: ${reason}`);
                } catch (e) {
                    console.log(`[AI MOD] Could not delete: ${e.message}`);
                }
            }

            // Warn or suspend
            if (aiSettings.warnFirst !== false) {
                const firstName = msg.from.first_name || 'User';
                const warningKey = `aiwarn_${chatId}_${fromId}`;
                if (!db.data.groupWarnings) db.data.groupWarnings = {};
                const warns = db.data.groupWarnings[warningKey] || { count: 0 };
                warns.count++;
                db.data.groupWarnings[warningKey] = warns;
                db.save();

                let warnText = `🤖 *AI Moderator* — ${firstName}\n\n⚠️ Your message was flagged: *${reason}*\n\nWarning ${warns.count}/3`;

                if (warns.count >= 3 && aiSettings.suspendUser !== false) {
                    warnText = `🚫 *AI Moderator* — ${firstName}\n\nYou have been muted for 24 hours due to repeated violations.`;
                    try {
                        await bot.restrictChatMember(chatId, fromId, {
                            permissions: {
                                can_send_messages: false,
                                can_send_media_messages: false,
                                can_send_polls: false,
                                can_send_other_messages: false,
                                can_add_web_page_previews: false
                            },
                            until_date: Math.floor(Date.now() / 1000) + 86400
                        });
                        warns.count = 0;
                        db.data.groupWarnings[warningKey] = warns;
                        db.save();
                    } catch (e) {
                        console.log(`[AI MOD] Could not mute: ${e.message}`);
                    }
                }

                try {
                    const botUsername = db.data?.settings?.botUsername || 'AutosVerify_bot';
                    const warnMsg = await bot.sendMessage(chatId, warnText, {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[{ text: '🚀 Open Bot', url: `https://t.me/${botUsername}` }]]
                        }
                    });
                    setTimeout(async () => {
                        try { await bot.deleteMessage(chatId, warnMsg.message_id); } catch (e) {}
                    }, 15000);
                } catch (e) {}
            }
        }
        // If SAFE — do nothing

    } catch (e) {
        // AI error is silent — don't crash group on API failures
        if (e.response?.status === 401) {
            console.error('[AI MOD] Invalid API key');
        } else {
            console.log(`[AI MOD] Error: ${e.message}`);
        }
    }
});
// ==================== AI CHATBOT (GROUP & CHANNEL RESPONDER) ====================
async function getChatbotResponse(userInput, chatId, senderName = 'User') {
    const apiKeys = db.data?.apiKeys || {};
    const aiModerator = db.data?.adminSettings?.aiModerator || {};
    const apiKey = process.env.OPENROUTER_API_KEY || apiKeys.openRouterKey || apiKeys.openrouterApiKey || aiModerator.apiKey;
    
    const systemPrompt = `You are "Auto Verify Bot", a helpful and friendly Telegram assistant. 
You provide temporary emails, virtual cards, SMM services, and VPN accounts. 
Respond to the user's message in their language (Bengali or English). Keep your response natural, conversational, polite, and brief (under 2-3 sentences). 
If the user is asking about services, let them know they can start the bot in private chat to buy them.`;

    if (apiKey) {
        try {
            const axios = require('axios');
            const isOpenRouter = apiKey.startsWith('sk-or-') || !apiKey.startsWith('sk-');
            const apiBase = isOpenRouter ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
            const model = isOpenRouter ? 'google/gemini-2.5-flash' : 'gpt-4o-mini';
            
            const response = await axios.post(apiBase, {
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userInput }
                ],
                max_tokens: 250,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://ai.studio/build',
                    'X-Title': 'Auto Verify Bot'
                },
                timeout: 10000
            });
            
            const content = response.data?.choices?.[0]?.message?.content;
            if (content) return content.trim();
        } catch (err) {
            console.error('[AI CHAT] API call failed:', err.message);
        }
    }

    // High quality Bengali / English rules fallback if API keys are missing/failing
    const text = userInput.toLowerCase();
    
    if (text.includes('hi') || text.includes('hello') || text.includes('হ্যালো') || text.includes('হাই') || text.includes('সালাম')) {
        return `আসসালামু আলাইকুম! আমি Auto Verify Bot। আমি আপনাকে কীভাবে সাহায্য করতে পারি? আপনার যদি কোনো সাহায্য লাগে, দয়া করে আমাকে জানান। 😊`;
    }
    if (text.includes('vpn') || text.includes('ভিপিএন')) {
        return `আমাদের কাছে NordVPN, ExpressVPN, Surfshark সহ অনেক প্রিমিয়াম VPN অ্যাকাউন্ট রয়েছে। VPN কিনতে দয়া করে বটের ইনবক্সে /start লিখুন এবং VPN সেকশনে যান। 🛡️`;
    }
    if (text.includes('mail') || text.includes('email') || text.includes('ইমেইল') || text.includes('ইনবক্স')) {
        return `আমাদের বোটে আপনি আনলিমিটেড টেম্পোরারি ইমেইল ও প্রিমিয়াম জিমেইল/হটমেইল পাবেন। সরাসরি বটের ইনবক্সে মেসেজ করে সার্ভিসগুলো ব্যবহার করুন! ✉️`;
    }
    if (text.includes('price') || text.includes('দাম') || text.includes('কত')) {
        return `আমাদের সকল সার্ভিসের দাম এবং স্টক লাইভ দেখতে সরাসরি বটের ইনবক্সে প্রবেশ করে মেনু দেখুন। আমাদের দাম খুবই সাশ্রয়ী! 💰`;
    }
    if (text.includes('card') || text.includes('কার্ড')) {
        return `আমরা প্রিমিয়াম ভার্চুয়াল কার্ড ও বিভিন্ন সাবস্ক্রিপশন দিয়ে থাকি। বিস্তারিত জানতে বটের ইনবক্সে ক্লিক করুন! 💳`;
    }
    if (text.includes('help') || text.includes('সাহায্য') || text.includes('কাজ')) {
        return `আমি আপনাকে টেম্পোরারি ইমেইল, প্রিমিয়াম জিমেইল, ভার্চুয়াল কার্ড এবং ভিপিএন সার্ভিস দিয়ে সাহায্য করতে পারি। সরাসরি বটের প্রাইভেট চ্যাটে শুরু করতে নিচে ক্লিক করুন!`;
    }
    
    const generalResponses = [
        "জি ভাইয়া, আমি আপনার কথা শুনতে পাচ্ছি। আপনার কোনো নির্দিষ্ট সাহায্য লাগবে কি? 😊",
        "আমি আপনার যেকোনো প্রশ্নের উত্তর দিতে প্রস্তুত! আপনি কী জানতে চান বলুন।",
        "আমি একটি অটোমেটেড চ্যাট অ্যাসিস্ট্যান্ট। কোনো প্রিমিয়াম সার্ভিস কিনতে অনুগ্রহ করে বটের প্রাইভেট চ্যাটে জয়েন করুন!",
        "ধন্যবাদ আপনার মেসেজের জন্য! অনুগ্রহ করে আপনার প্রশ্নটি আরও বিস্তারিতভাবে বলুন যেন আমি আপনাকে সঠিকভাবে সাহায্য করতে পারি।"
    ];
    return generalResponses[Math.floor(Math.random() * generalResponses.length)];
}

async function handleGroupOrChannelChat(msg, isChannel = false) {
    if (!msg.chat) return;
    if (!msg.text) return;
    
    // For groups: skip if bot sent it
    if (!isChannel) {
        if (!msg.from || msg.from.is_bot) return;
        // Skip channel-linked posts or forwards to prevent infinite loops/duplicate processing
        if (msg.sender_chat) return;
        if (msg.forward_from_chat) return;
    } else {
        // For channels: skip system/service messages
        if (msg.video_chat_started || msg.voice_chat_started || msg.video_chat_ended || msg.voice_chat_ended) return;
    }

    const text = msg.text.trim();
    const chatId = msg.chat.id;
    const botUsername = db.data?.settings?.botUsername || 'AutosVerify_bot';

    // Get group management settings
    const groupSettingsQA = db.data?.adminSettings?.groupManagement || {};
    if (groupSettingsQA.autoRespond === false) return;

    try {
        // Show typing indicator
        bot.sendChatAction(chatId, 'typing').catch(() => {});

        const senderName = isChannel ? 'Channel Subscriber' : (msg.from ? (msg.from.first_name || 'User') : 'User');
        const replyText = await getChatbotResponse(text, chatId, senderName);

        if (replyText) {
            const autoReply = await bot.sendMessage(chatId, replyText, {
                parse_mode: 'Markdown',
                reply_to_message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🚀 Open Bot', url: `https://t.me/${botUsername}` }
                    ]]
                }
            });

            // For groups, auto-delete after 45 seconds to keep chat clean
            if (!isChannel) {
                setTimeout(async () => {
                    try { await bot.deleteMessage(chatId, autoReply.message_id); } catch (e) {}
                }, 45000);
            }
        }
    } catch (e) {
        console.log(`[CHATBOT ERROR] ${e.message}`);
    }
}

// Answer questions and talk with AI in group
bot.on('message', async (msg) => {
    if (!msg.chat || !['group', 'supergroup'].includes(msg.chat.type)) return;
    await handleGroupOrChannelChat(msg, false);
});

// ==================== CHAT JOIN REQUEST HANDLER ====================
// Handle "Request to Join" updates for private channels/groups
bot.on('chat_join_request', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || 'User';
    
    console.log(`[JOIN_REQUEST] Received join request from ${firstName} (${userId}) for ${msg.chat.title || chatId}`);

    // Check settings
    const groupSettings = db.data?.adminSettings?.groupManagement || {};
    // Check both locations for compatibility
    const autoApprove = db.data?.adminSettings?.autoApproveJoinRequests === true || 
                        groupSettings.autoApproveJoinRequests === true;

    if (autoApprove) {
        try {
            // Approve the request
            await bot.approveChatJoinRequest(chatId, userId);
            console.log(`[JOIN_REQUEST] Approved ${firstName} for ${msg.chat.title}`);

            // Send a welcome message directly to the user
            const welcomeText = `✅ **Congratulations!**\n\nYour request to join **${msg.chat.title}** has been approved. \n\n🚀 Click below to start using the bot and access all features!`;
            
            await bot.sendMessage(userId, welcomeText, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💎 Open Bot', url: `https://t.me/${db.data.settings?.botUsername || 'YourBot'}?start=approved` }]
                    ]
                }
            }).catch(() => {
                // User might have blocked the bot, ignore
            });

        } catch (e) {
            console.log(`[JOIN_REQUEST] Error approving user: ${e.message}`);
        }
    } else {
        console.log(`[JOIN_REQUEST] Auto-approval is OFF. Request left pending.`);
    }
});


// 🚨 Auto-detect when user leaves/is kicked from required channel or group
bot.on('chat_member', async (update) => {
    try {
        const chatId = update.chat.id;
        const chatType = update.chat.type; // 'channel', 'group', 'supergroup'
        const chatUsername = update.chat.username ? '@' + update.chat.username : String(chatId);
        const newStatus = update.new_chat_member.status;
        const userId = update.new_chat_member.user.id;
        const isBot = update.new_chat_member.user.is_bot;
        if (isBot) return; // Ignore bot status changes

        // ✅ FIX: Get channel/group IDs from both config and database
        const apiKeys = db.data?.apiKeys || {};
        const settings = db.data?.settings || {};
        
        const requiredChannelId = apiKeys.requiredChannelId || config.REQUIRED_CHANNEL_ID || '';
        const requiredChannelName = apiKeys.requiredChannel || settings.requiredChannel || config.REQUIRED_CHANNEL || '';
        
        const requiredGroupId = apiKeys.requiredGroupId || config.REQUIRED_GROUP_ID || '';
        const requiredGroupName = apiKeys.requiredGroup || settings.requiredGroup || config.REQUIRED_GROUP || '';

        // ✅ FIX: Check if this chat matches any of our required chats
        const chatIdStr = String(chatId);
        const chatUsernameClean = chatUsername.replace('@', '').toLowerCase();
        
        const isRequiredChannel = (
            chatIdStr === requiredChannelId ||
            chatIdStr === requiredChannelName ||
            chatUsernameClean === requiredChannelName.replace('@', '').toLowerCase() ||
            (chatType === 'channel' && (chatIdStr === '-1002516230551' || chatUsernameClean === 'autosverifych'))
        );
        
        const isRequiredGroup = (
            chatIdStr === requiredGroupId ||
            chatIdStr === requiredGroupName ||
            chatUsernameClean === requiredGroupName.replace('@', '').toLowerCase() ||
            (chatType === 'supergroup' && (chatIdStr === '-1002502678666' || chatUsernameClean === 'autosverify'))
        );

        const isRequiredChat = isRequiredChannel || isRequiredGroup;

        if (!isRequiredChat) {
            console.log(`[chat_member] Ignoring non-required chat: ${chatUsername} (${chatId})`);
            return; // Not a monitored chat
        }

        console.log(`[chat_member] Detected event in required chat: ${chatUsername} (${chatId}, type: ${chatType})`);

        const leftStatuses = ['left', 'kicked', 'banned'];
        const joinStatuses = ['member', 'administrator', 'creator'];
        const oldStatus = update.old_chat_member ? update.old_chat_member.status : null;

        if (joinStatuses.includes(newStatus) && (!oldStatus || leftStatuses.includes(oldStatus))) {
            // User JOINED!
            console.log(`🎉 User ${userId} joined monitored chat: ${chatUsername}`);

            const user = db.getUser(userId);
            if (user) {
                user.verified = true;
                user.verifiedAt = new Date().toISOString();
                db.updateUser(user);
                console.log(`[VERIFICATION] User ${userId} marked as VERIFIED (joined ${chatUsername})`);

                // ✅ FIX: Send welcome message for channel joins
                const botUsername = db.data.settings?.botUsername || 'YourBot';
                const chatName = update.chat.title || chatUsername;
                const welcomeText = `🎉 **Welcome to ${chatName}!**\n\nThanks for joining our community.\n\n🚀 You are now verified! Click below to open the bot and use all features!`;

                bot.sendMessage(userId, welcomeText, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💎 Open Bot', url: `https://t.me/${botUsername}?start=joined` }]
                        ]
                    }
                }).catch((err) => {
                    console.log(`[chat_member] Could not send welcome message to ${userId}: ${err.message}`);
                });
            }
            return; // Done for join
        }

        if (!leftStatuses.includes(newStatus)) return; // Not leaving

        // User left or was kicked from a required chat - update status
        console.log(`🚨 User ${userId} left monitored chat: ${chatUsername}`);

        // Update user verification status in database
        const user = db.getUser(userId);
        if (user) {
            user.verified = false;
            user.verifiedAt = null;
            user.leftAt = new Date().toISOString();
            user.leftFrom = chatUsername;
            db.updateUser(user);
            console.log(`[VERIFICATION] User ${userId} marked as UNVERIFIED (left ${chatUsername})`);
        }

        // Notify admin immediately
        const adminId = config.ADMIN_ID;
        if (adminId) {
            bot.sendMessage(adminId,
                `⚠️ *User Left Community*\n\n` +
                `User ID: \`${userId}\`\n` +
                `Left from: ${chatUsername}\n` +
                `Status: ${newStatus}\n` +
                `Time: ${new Date().toLocaleString()}\n\n` +
                `User marked as UNVERIFIED in database.`,
                { parse_mode: 'Markdown' }
            ).catch(() => { });
        }

        // Re-check full membership status
        const membership = await checkMembership(userId);

        // Only notify if actually missing something
        if (!membership.channel || !membership.group) {
            showMandatoryJoin(userId, membership);
        }

        // ── AUTO-DELETE: If user left both channel AND group → delete account ──
        // Wait 5 seconds to allow checkMembership to settle
        setTimeout(async () => {
            try {
                const adminIdStr = String(config.ADMIN_ID || '');
                if (String(userId) === adminIdStr) return; // Never delete admin

                // Re-check live membership
                const freshMembership = await checkMembership(userId);
                if (!freshMembership.channel && !freshMembership.group) {
                    console.log(`[AUTO-DELETE] User ${userId} confirmed out of both — deleting account`);

                    // Notify admin before delete
                    if (adminId) {
                        bot.sendMessage(adminId,
                            `🗑 *Auto-Delete Triggered*\n\nUser \`${userId}\` left both channel and group.\nAccount and all data have been deleted.`,
                            { parse_mode: 'Markdown' }
                        ).catch(() => {});
                    }

                    await _fullDeleteUser(String(userId));
                }
            } catch (e) {
                console.error('[AUTO-DELETE] Post-leave check error:', e.message);
            }
        }, 5000);
    } catch (e) {
        // Silently handle errors
        console.error('[chat_member] Error:', e.message);
    }
});

// Callback Query Handler
bot.on('callback_query', async (query) => {
    // Update Activity
    if (query.from && query.from.id) db.updateUserActivity(query.from.id);

    // Strict Membership Check
    const userId = query.from.id;
    const user = db.getUser(userId);
    
    const settings = db.getSettings ? db.getSettings() : {};
    const joinRequired = settings.joinRequired !== undefined ? settings.joinRequired : true;
    
    if (joinRequired && (!user || !user.verified)) {
        const membership = await checkMembership(userId);
        if (!membership.channel || !membership.group) {
            showMandatoryJoin(userId, membership);
            return; // Stop processing further
        } else if (user) {
            user.verified = true;
            user.verifiedAt = new Date().toISOString();
            db.updateUser(user);
        }
    }

    // ----------------------------------------------------
    // DEBOUNCE LOGIC (Prevent Double Click)
    // ----------------------------------------------------

    const now = Date.now();
    const lastTime = callbackThrottle.get(userId) || 0;

    if (now - lastTime < 1500) {
        // Prevent spam clicking (1.5s delay)
        return bot.answerCallbackQuery(query.id);
    }
    callbackThrottle.set(userId, now);

    try {
        const chatId = query.message.chat.id;
        const data = query.data;
        const msgId = query.message.message_id;
        const username = query.from.username || query.from.first_name || 'Unknown';

        // Global interceptor: silently ignore non-admins for all admin commands to prevent spam/replies
        if (data.startsWith('admin_') && !isAdmin(userId)) {
            return bot.answerCallbackQuery(query.id).catch(() => {});
        }

        // Log user activity
        console.log(`👤 User: ${userId} (${username}) | 💬 Action: ${data} | ⏰ ${new Date().toLocaleTimeString()}`);

        // Ensure User Exists
        const user = db.getUser(userId);

        // CHECK MEMBERSHIP ON EVERY ACTION (except verify, main_menu, admin)
        const skipMembershipCheck = [
            'verify_membership', 'main_menu', 'admin_panel',
            'deposit_approve', 'deposit_reject', 'smm_complete', 'smm_cancel'
        ].some(k => data === k || data.startsWith(k + '_'));
        // Skip if admin OR if user is manually verified by admin
        const isManuallyVerified = user && (user.adminVerified === true || user.verifiedByAdmin === true);
        if (!skipMembershipCheck && !isAdmin(userId) && !isManuallyVerified) {
            const membership = await checkMembership(userId);
            if (!membership.channel || !membership.group) {
                // User left group/channel - show join message immediately
                showMandatoryJoin(chatId, membership, msgId);
                return bot.answerCallbackQuery(query.id, {
                    text: "⚠️ Please join required communities first!",
                    show_alert: true
                });
            }
        }

        // ===== DEPOSIT APPROVE/REJECT (Admin-only — via Telegram inline buttons) =====
        if (data.startsWith('deposit_approve_') || data.startsWith('deposit_reject_')) {
            if (!isAdmin(userId)) {
                return bot.answerCallbackQuery(query.id, { text: '⛔ Admin only!', show_alert: true });
            }
            const action = data.startsWith('deposit_approve_') ? 'approve' : 'reject';
            const depositId = data.replace('deposit_approve_', '').replace('deposit_reject_', '');

            try {
                const { processDepositCallback } = require('./database/server.js');
                const result = await processDepositCallback(depositId, action, chatId, msgId);

                await bot.answerCallbackQuery(query.id, {
                    text: result.message || (action === 'approve' ? '✅ Approved!' : '❌ Rejected!'),
                    show_alert: true
                });

                // Update the message to show the result
                try {
                    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                        chat_id: chatId,
                        message_id: msgId
                    });
                    // Append status to caption/text
                    const statusText = action === 'approve' ? '✅ APPROVED' : '❌ REJECTED';
                    const originalText = query.message.caption || query.message.text || '';
                    const newText = originalText + `\n\n*Status:* ${statusText}`;
                    if (query.message.caption !== undefined) {
                        await bot.editMessageCaption(newText, {
                            chat_id: chatId, message_id: msgId, parse_mode: 'Markdown'
                        });
                    } else {
                        await bot.editMessageText(newText, {
                            chat_id: chatId, message_id: msgId, parse_mode: 'Markdown'
                        });
                    }
                } catch (editErr) {
                    // Ignore edit errors (message might be too old)
                }
            } catch (e) {
                console.error('[DEPOSIT CALLBACK] Error:', e.message);
                await bot.answerCallbackQuery(query.id, { text: '❌ Error: ' + e.message, show_alert: true });
            }
            return;
        }

        // ===== SMM ORDER COMPLETE/CANCEL (Admin-only) =====
        if (data.startsWith('smm_complete_') || data.startsWith('smm_cancel_')) {
            if (!isAdmin(userId)) {
                return bot.answerCallbackQuery(query.id, { text: '⛔ Admin only!', show_alert: true });
            }
            const smmAction = data.startsWith('smm_complete_') ? 'completed' : 'cancelled';
            const orderId = data.replace('smm_complete_', '').replace('smm_cancel_', '');

            const orders = db.data.smmOrders || [];
            const order = orders.find(o => o.id === orderId);
            if (order) {
                const prevStatus = order.status;
                order.status = smmAction;
                order.updatedAt = Date.now();

                // Refund gems on cancellation (only once, only if pending)
                let refunded = false;
                if (smmAction === 'cancelled' && prevStatus !== 'cancelled' && order.gemsSpent > 0) {
                    try {
                        const users = db.data.users || {};
                        const orderUser = users[order.userId?.toString()];
                        if (orderUser) {
                            const currentGems = parseFloat(orderUser.Gems || orderUser.balance_Gems || 0);
                            const refundAmt = parseFloat(order.gemsSpent);
                            orderUser.Gems = parseFloat((currentGems + refundAmt).toFixed(4));
                            orderUser.balance_Gems = orderUser.Gems;
                            if (!orderUser.history) orderUser.history = [];
                            orderUser.history.unshift({
                                type: 'smm_refund',
                                amount: +refundAmt,
                                currency: 'Gems',
                                date: Date.now(),
                                detail: `Refund: ${order.platform || 'instagram'} ${order.service} order cancelled (#${orderId.slice(-6)})`
                            });
                            refunded = true;
                            order.refunded = true;
                        }
                    } catch (re) { console.error('[SMM Refund]', re.message); }
                }

                db.save();

                // Notify user
                if (order.userId) {
                    const refundNote = refunded ? `\n💎 Refunded: ${order.gemsSpent} Gems` : '';
                    bot.sendMessage(order.userId,
                        `${smmAction === 'completed' ? '✅' : '❌'} *${order.platform === 'website' ? 'Traffic' : 'Instagram'} Order ${smmAction}*\n\n` +
                        `🔧 Service: ${order.service}\n` +
                        (order.username ? `📲 Account: @${order.username}\n` : `🌐 URL: ${order.targetUrl || ''}\n`) +
                        `🔢 Quantity: ${order.quantity}${refundNote}`,
                        { parse_mode: 'Markdown' }
                    ).catch(() => {});
                }

                await bot.answerCallbackQuery(query.id, {
                    text: `Order ${smmAction}!${refunded ? ' Gems refunded.' : ''}`,
                    show_alert: true
                });
                try {
                    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: msgId });
                } catch (e) {}
            } else {
                await bot.answerCallbackQuery(query.id, { text: 'Order not found', show_alert: true });
            }
            return;
        }

        // VIEW API KEY
        if (data === 'view_api_key' || data === 'api_key') {
            await bot.answerCallbackQuery(query.id);
            if (user.apiStatus === 'ban') {
                return bot.sendMessage(chatId, "🚫 **Access Denied**\n\nYour API access has been restricted.", { parse_mode: 'Markdown' });
            }

            if (!user.apiKey) {
                return bot.sendMessage(chatId, 
                    "🔑 **API Access**\n\nYou haven't generated an API key yet.\n\nPlease open the **Mini App > Profile > API Access** to generate your key.", 
                    { 
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[{ text: '🚀 Open Mini App', web_app: { url: config.PUBLIC_URL } }]]
                        }
                    }
                );
            }

            const msgText = 
                `🔑 **Your API Access**\n\n` +
                `👤 **User ID:** \`${userId}\`\n` +
                `🔐 **API Key:** \`${user.apiKey}\`\n\n` +
                `⚠️ **Security Warning:**\n` +
                `Do not share this key with anyone. It gives full access to your account balances and services via API.`;

            return bot.sendMessage(chatId, msgText, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔄 Regenerate in App', web_app: { url: config.PUBLIC_URL } }],
                        [{ text: '📚 API Documentation', url: 'https://docs.autosverify.com' }]
                    ]
                }
            });
        }

        // VERIFY MEMBERSHIP (Mandatory Join Check)
        if (data === 'verify_membership') {
            await bot.answerCallbackQuery(query.id, { text: "🔍 Checking membership...", show_alert: false }).catch(() => { });

            const membership = await checkMembership(userId);
            const allJoined = membership.channel && membership.group;

            if (allJoined) {
                // ✅ FIX: Mark user as verified in database
                if (user) {
                    user.verified = true;
                    db.updateUser(user);
                }

                // Verification Success
                bot.editMessageText(`✅ *Verification Success!*\n\nWelcome to the bot!\n\nTime: ${new Date().toLocaleString()}`, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'Markdown'
                }).catch(() => { });

                // PROCESS PENDING REFERRAL - Verify and give reward
                if (user && user.pendingReferrer) {
                    db.verifyReferral(userId);
                    user.pendingReferrer = null;
                    db.updateUser(user);
                }

                // ✅ FIX: Wait a moment before deleting and showing main menu
                setTimeout(() => {
                    bot.deleteMessage(chatId, msgId).catch(() => { });
                    sendMainMenu(chatId, user);
                }, 1500);
            } else {
                // Still missing communities
                showMandatoryJoin(chatId, membership, msgId);
            }
            return;
        }

        if (data === 'main_menu') {
            bot.deleteMessage(chatId, msgId).catch(() => { });
            sendMainMenu(chatId, user);
        }

        // ==================== ADMIN PANEL ====================

        // ADMIN PANEL MAIN
        else if (data === 'admin_panel') {
            if (!isAdmin(userId)) {
                return bot.answerCallbackQuery(query.id, { text: "⚠️ Admin Access Only", show_alert: true });
            }

            // Delete previous message to avoid edit errors
            bot.deleteMessage(chatId, msgId).catch(() => { });

            const msg = `⚙️ <b>Admin Panel</b>\n\nManage your bot from here:`;

            const publicUrl = (process.env.PUBLIC_URL || `http://localhost:3000`).trim();
            const adminUrl = `${publicUrl}/admin`;

            bot.sendMessage(chatId, msg, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🚀 Open Admin Panel', web_app: { url: adminUrl } }]
                    ]
                }
            }).catch(e => console.error('Admin Panel Error:', e.message));
        }
        else if (data === 'admin_session_menu') {
            if (!isAdmin(userId)) {
                return bot.answerCallbackQuery(query.id, { text: "⚠️ Admin Access Only", show_alert: true });
            }
            await bot.answerCallbackQuery(query.id);
            await sendAdminSessionMenu(chatId, msgId);
        }
        else if (data === 'admin_join_voice') {
            if (!isUserbotConfigured()) {
                return bot.answerCallbackQuery(query.id, {
                    text: "⚠️ Userbot Not Configured!\n\nStandard bots cannot physically join voice chats. Please configure your Assistant Bot Token or Session String in the Web Admin Panel first.",
                    show_alert: true
                });
            }
            if (!db.data.liveAudio) db.data.liveAudio = {};
            db.data.liveAudio.status = 'Connected';
            db.save();
            await bot.answerCallbackQuery(query.id, { text: "🎙️ Assistant has joined the live stream successfully!", show_alert: true });
            await sendAdminSessionMenu(chatId, msgId);
        }
        else if (data === 'admin_leave_voice') {
            if (!isUserbotConfigured()) {
                return bot.answerCallbackQuery(query.id, {
                    text: "⚠️ Userbot Not Configured!\n\nStandard bots cannot control voice chats directly without assistant setup.",
                    show_alert: true
                });
            }
            if (!db.data.liveAudio) db.data.liveAudio = {};
            db.data.liveAudio.status = 'Offline';
            db.data.liveAudio.currentMusic = 'None';
            db.save();
            await bot.answerCallbackQuery(query.id, { text: "🛑 Assistant left the live stream voice chat.", show_alert: true });
            await sendAdminSessionMenu(chatId, msgId);
        }
        else if (data === 'admin_play_music') {
            if (!isUserbotConfigured()) {
                return bot.answerCallbackQuery(query.id, {
                    text: "⚠️ Userbot Not Configured!\n\nCannot play audio stream without a registered Assistant.",
                    show_alert: true
                });
            }
            if (!db.data.liveAudio) db.data.liveAudio = {};
            db.data.liveAudio.status = 'Connected';
            db.data.liveAudio.currentMusic = db.data.liveAudio.currentMusic !== 'None' ? db.data.liveAudio.currentMusic : presetSongs[0].name;
            db.save();
            await bot.answerCallbackQuery(query.id, { text: `▶️ Playback started: ${db.data.liveAudio.currentMusic}`, show_alert: false });
            await sendAdminSessionMenu(chatId, msgId);
        }
        else if (data === 'admin_stop_music') {
            if (!isUserbotConfigured()) {
                return bot.answerCallbackQuery(query.id, {
                    text: "⚠️ Userbot Not Configured!\n\nNo active music playback stream to stop.",
                    show_alert: true
                });
            }
            if (!db.data.liveAudio) db.data.liveAudio = {};
            db.data.liveAudio.currentMusic = 'None';
            db.save();
            await bot.answerCallbackQuery(query.id, { text: "⏸️ Playback stopped / paused.", show_alert: false });
            await sendAdminSessionMenu(chatId, msgId);
        }
        else if (data.startsWith('admin_vol_')) {
            if (!isUserbotConfigured()) {
                return bot.answerCallbackQuery(query.id, {
                    text: "⚠️ Userbot Not Configured!\n\nCannot adjust stream volume without a running Assistant.",
                    show_alert: true
                });
            }
            const vol = parseInt(data.replace('admin_vol_', ''));
            if (!db.data.liveAudio) db.data.liveAudio = {};
            db.data.liveAudio.volume = vol;
            db.save();
            await bot.answerCallbackQuery(query.id, { text: `🔊 Volume set to ${vol}%`, show_alert: false });
            await sendAdminSessionMenu(chatId, msgId);
        }
        else if (data === 'admin_custom_link') {
            if (!isUserbotConfigured()) {
                return bot.answerCallbackQuery(query.id, {
                    text: "⚠️ Userbot Not Configured!\n\nCannot stream links without a registered Assistant.",
                    show_alert: true
                });
            }
            await bot.answerCallbackQuery(query.id);
            userState[userId] = { state: 'awaiting_custom_music_link', optionsMessageId: msgId };
            await bot.sendMessage(chatId, `📺 **Play Custom Music / YouTube Stream**\n\n💬 Please send/paste the YouTube video/audio link you want to stream.\n\n_Example:_ \`https://www.youtube.com/watch?v=xxxx\`\n\n_Type your link now, or send /cancel to abort._`);
        }
        else if (data === 'admin_playlist') {
            if (!isUserbotConfigured()) {
                return bot.answerCallbackQuery(query.id, {
                    text: "⚠️ Userbot Not Configured!\n\nAssistant setup is required to access playlists.",
                    show_alert: true
                });
            }
            await bot.answerCallbackQuery(query.id);
            await sendAdminPlaylistMenu(chatId, msgId);
        }
        else if (data.startsWith('admin_select_song_')) {
            if (!isUserbotConfigured()) {
                return bot.answerCallbackQuery(query.id, {
                    text: "⚠️ Userbot Not Configured!\n\nSelect song requires an Assistant to play.",
                    show_alert: true
                });
            }
            const idx = parseInt(data.replace('admin_select_song_', ''));
            const selectedSong = presetSongs[idx];
            if (selectedSong) {
                if (!db.data.liveAudio) db.data.liveAudio = {};
                db.data.liveAudio.status = 'Connected';
                db.data.liveAudio.currentMusic = selectedSong.name;
                db.data.liveAudio.activePlaylist = selectedSong.name.split(' (')[0];
                db.save();
                await bot.answerCallbackQuery(query.id, { text: `🎵 Selected & playing: ${selectedSong.name}`, show_alert: true });
            }
            await sendAdminSessionMenu(chatId, msgId);
        }
    } catch (e) {
        console.error('Error handling callback query:', e);
    }
});




// ==================== BROADCAST SCHEDULER ====================
// Check for scheduled broadcasts every minute — with duplicate prevention
const _broadcastSentTracker = new Map(); // broadcastId -> Set of sent chatIds

setInterval(() => {
    const scheduled = db.getScheduledBroadcasts();
    const now = Date.now();

    scheduled.forEach(async (broadcast) => {
        if (broadcast.scheduledTime <= now) {
            // Prevent re-processing the same broadcast
            if (_broadcastSentTracker.has(broadcast.id + '_done')) return;
            _broadcastSentTracker.set(broadcast.id + '_done', true);

            console.log(`📣 Sending scheduled broadcast: ${broadcast.id}`);

            const users = Object.values(db.data.users || {});
            const buttons = broadcast.buttons && broadcast.buttons.length > 0 ? { inline_keyboard: broadcast.buttons } : null;
            let successCount = 0;
            let failCount = 0;

            // Track already-sent users for this broadcast (deduplication)
            const alreadySent = _broadcastSentTracker.get(broadcast.id) || new Set();
            _broadcastSentTracker.set(broadcast.id, alreadySent);

            for (const user of users) {
                const uid = String(user.id);
                if (alreadySent.has(uid)) continue; // Skip already sent
                alreadySent.add(uid);

                try {
                    let sentCount = 0; // Track that we're only sending once per user
                    
                    const opts = {
                        caption: broadcast.message,
                        parse_mode: 'Markdown',
                        reply_markup: buttons
                    };

                    if (broadcast.mediaType === 'photo') {
                        await bot.sendPhoto(user.id, broadcast.mediaId, opts);
                        sentCount++;
                    } else if (broadcast.mediaType === 'video') {
                        await bot.sendVideo(user.id, broadcast.mediaId, opts);
                        sentCount++;
                    } else {
                        await bot.sendMessage(user.id, broadcast.message, { ...opts, caption: undefined });
                        sentCount++;
                    }
                    
                    if (sentCount > 0) {
                        successCount++;
                    }
                } catch (error) {
                    // Retry without Markdown if parse error — BUT ONLY IF FIRST ATTEMPT FAILED
                    if (error.response && error.response.body && error.response.body.description && error.response.body.description.includes('parse')) {
                        try {
                            const plainOpts = { caption: broadcast.message, reply_markup: buttons };
                            if (broadcast.mediaType === 'photo') {
                                await bot.sendPhoto(user.id, broadcast.mediaId, plainOpts);
                            } else if (broadcast.mediaType === 'video') {
                                await bot.sendVideo(user.id, broadcast.mediaId, plainOpts);
                            } else {
                                await bot.sendMessage(user.id, broadcast.message, { reply_markup: buttons });
                            }
                            successCount++;
                        } catch (e) {
                            failCount++;
                        }
                    } else {
                        failCount++;
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Notify admin
            if (broadcast.createdBy) {
                bot.sendMessage(broadcast.createdBy,
                    `📢 *Scheduled Broadcast Sent!*\n\n` +
                    `✅ Successful: ${successCount}\n` +
                    `❌ Failed: ${failCount}\n` +
                    `📈 Total: ${users.length}`,
                    { parse_mode: 'Markdown' }
                ).catch(() => {});
            }

            // Remove from scheduled list
            db.removeScheduledBroadcast(broadcast.id);
            // Clean up tracker after 1 hour
            setTimeout(() => _broadcastSentTracker.delete(broadcast.id), 3600000);
        }
    });
}, 60000);

console.log('📅 Broadcast scheduler started');



// Auto Cleanup History (Every 24 Hours)
setInterval(() => {
    try {
        console.log('🧹 Running daily cleanup...');
        const count = db.cleanupOldHistory(7); // Keep 7 days
        if (count > 0) console.log(`✅ Cleaned up ${count} old records.`);
    } catch (e) {
        console.error('❌ Cleanup failed:', e);
    }
}, 24 * 60 * 60 * 1000);




// ==================== HELPERS ====================

function getFlagEmoji(countryCode) {
    if (!countryCode) return '🌍';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

function getPhoneCode(countryCode) {
    if (!countryCode) return '00';
    const upper = countryCode.toUpperCase();

    // If it's already a number (e.g. "1", "880"), return it
    if (/^\d+$/.test(upper)) return upper;
    // If it starts with +, strip it
    if (upper.startsWith('+')) return upper.substring(1);

    const codes = {
        'US': '1', 'CA': '1', 'UK': '44', 'GB': '44', 'RU': '7', 'UA': '380',
        'KZ': '7', 'CN': '86', 'IN': '91', 'BD': '880', 'ID': '62',
        'VN': '84', 'PH': '63', 'MY': '60', 'TH': '66', 'EG': '20',
        'SA': '966', 'AE': '971', 'TR': '90', 'BR': '55', 'NG': '234'
    };
    return codes[upper] || '00';
}

// Web Panel Removed.
// Server is started via index.js for OAuth handling.

// ==================== BROADCAST COMMAND ====================
    bot.onText(/\/broadcast (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) return;

        const message = match[1];
        bot.sendMessage(chatId, `📢 Starting broadcast...`);

        const users = db.getUsers();
        const targetIds = Object.keys(users);

        let sent = 0;
        let failed = 0;

        for (const tid of targetIds) {
            try {
                await bot.sendMessage(tid, message);
                sent++;
                await new Promise(r => setTimeout(r, 50)); // Rate limit 20msg/sec
            } catch (e) {
                failed++;
            }
        }

        bot.sendMessage(chatId, `✅ Broadcast Complete.\nSent: ${sent}\nFailed: ${failed}`);
    });
}


// ── Bot Hosting: receive file from user ──────────────────────────────────────
bot.on('document', async (msg) => {
    try {
        const chatId = msg.chat.id;
        const userId = String(msg.from.id);
        const doc = msg.document;
        if (!doc) return;

        // Check file type — allow bot script files and archives
        const allowedExts = ['.py', '.js', '.mjs', '.ts', '.php', '.rb', '.go', '.sh', '.bash', '.zip', '.tar', '.gz', '.json'];
        const blockedExts = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mp3', '.avi', '.mkv', '.pdf', '.docx', '.xlsx'];
        const fileName = doc.file_name || 'bot.py';
        const ext = fileName.includes('.') ? '.' + fileName.split('.').pop().toLowerCase() : '';

        // Block only clearly wrong types
        if (blockedExts.includes(ext)) return; // Not a bot file, ignore silently

        // Auto-create pending upload state if not exists
        if (!db.data.botHosting) db.data.botHosting = { bots: {}, servers: [], pendingUploads: {} };
        if (!db.data.botHosting.pendingUploads) db.data.botHosting.pendingUploads = {};

        // Check file size (100MB max)
        if (doc.file_size && doc.file_size > 100 * 1024 * 1024) {
            await bot.sendMessage(chatId, `❌ File too large. Maximum 100MB allowed.\n\nYour file: ${Math.round(doc.file_size / 1024 / 1024)}MB`);
            return;
        }

        await bot.sendMessage(chatId, `⏳ Receiving your bot file *${fileName}*...`, { parse_mode: 'Markdown' });

        // Download file from Telegram
        const fileInfo = await bot.getFile(doc.file_id);

        // Get bot token from config (multiple sources)
        const botToken = process.env.TELEGRAM_BOT_TOKEN
            || (db.data.settings && db.data.settings.botToken)
            || require('./config').TELEGRAM_BOT_TOKEN;

        if (!botToken) {
            await bot.sendMessage(chatId, `❌ Server configuration error. Please contact admin.`);
            return;
        }

        const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;

        // Save to uploads directory
        const pathLib = require('path');
        const fsLib = require('fs');
        const uploadDir = pathLib.join(__dirname, 'web', 'uploads', 'bots');
        if (!fsLib.existsSync(uploadDir)) fsLib.mkdirSync(uploadDir, { recursive: true });

        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const savePath = pathLib.join(uploadDir, `${userId}_${Date.now()}_${safeName}`);

        const axios = require('axios');
        try {
            const response = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 60000 });
            fsLib.writeFileSync(savePath, response.data);
        } catch (downloadErr) {
            await bot.sendMessage(chatId, `❌ Failed to download file: ${downloadErr.message}\n\nPlease try again.`);
            return;
        }

        // Auto-detect language
        const langMap = { '.py': 'python', '.js': 'nodejs', '.ts': 'nodejs', '.php': 'php', '.rb': 'ruby', '.go': 'go', '.sh': 'bash', '.zip': 'python' };
        const language = langMap[ext] || 'python';

        // Store as pending file (overwrite any existing)
        const pendingId = `pf_${userId}_${Date.now()}`;
        db.data.botHosting.pendingUploads[String(userId)] = {
            createdAt: Date.now(),
            file: {
                id: pendingId,
                name: fileName,
                path: savePath,
                language,
                size: doc.file_size || 0
            }
        };
        db.save();

        await bot.sendMessage(chatId,
            `✅ *File received successfully!*\n\n` +
            `📁 *File:* \`${fileName}\`\n` +
            `🔤 *Language:* ${language}\n` +
            `📦 *Size:* ${Math.round((doc.file_size || 0) / 1024)} KB\n\n` +
            `Now go back to the *Bot Hosting* page and tap **✅ Check File** to continue deployment! 🚀`,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.error('[BOT HOSTING] Document receive error:', e.message);
        try {
            await bot.sendMessage(msg.chat.id, `❌ Failed to receive file: ${e.message}\n\nPlease try again.`);
        } catch (e2) {}
    }
});
// ── END Bot Hosting file receiver ────────────────────────────────────────────

// ==================== AUTO DELETE USER ON LEAVE ====================
// When a user leaves BOTH the required channel AND group,
// their account and all data are automatically deleted.

async function _checkAndDeleteUserIfLeft(userId) {
    if (!userId) return;
    const userIdStr = String(userId);

    // Never delete admin
    const adminId = config.ADMIN_ID;
    if (adminId && userIdStr === String(adminId)) return;

    try {
        const channel = config.REQUIRED_CHANNEL || config.REQUIRED_CHANNEL_NAME;
        const group   = config.REQUIRED_GROUP   || config.REQUIRED_GROUP_NAME;

        // If neither channel nor group configured — skip
        if (!channel && !group) return;

        let inChannel = true; // assume in if not configured
        let inGroup   = true;

        // Check channel membership
        if (channel) {
            try {
                const m = await bot.getChatMember(channel, userId);
                inChannel = ['member', 'administrator', 'creator', 'restricted'].includes(m.status);
            } catch (e) {
                // If bot can't check, assume still in (don't delete unfairly)
                inChannel = true;
            }
        }

        // Check group membership
        if (group) {
            try {
                const m = await bot.getChatMember(group, userId);
                inGroup = ['member', 'administrator', 'creator', 'restricted'].includes(m.status);
            } catch (e) {
                inGroup = true;
            }
        }

        // Only delete if out of BOTH
        if (!inChannel && !inGroup) {
            console.log(`[AUTO-DELETE] User ${userId} left both channel and group — deleting account`);
            await _fullDeleteUser(userIdStr);
        } else {
            console.log(`[AUTO-DELETE] User ${userId} still in ${inChannel ? 'channel' : ''}${inChannel && inGroup ? ' and ' : ''}${inGroup ? 'group' : ''} — NOT deleting`);
        }
    } catch (e) {
        console.error('[AUTO-DELETE] Check error for', userId, ':', e.message);
    }
}

async function _fullDeleteUser(userId) {
    try {
        const users = db.data.users || {};
        if (!users[userId]) return; // already gone

        // 1. Stop any running bot hosting intervals
        if (global._botHostingIntervals) {
            Object.keys(global._botHostingIntervals).forEach(botId => {
                if (db.data.botHosting && db.data.botHosting.bots &&
                    db.data.botHosting.bots[botId] &&
                    db.data.botHosting.bots[botId].userId === userId) {
                    clearInterval(global._botHostingIntervals[botId]);
                    delete global._botHostingIntervals[botId];
                }
            });
        }

        // 2. Delete bot hosting entries & files
        if (db.data.botHosting && db.data.botHosting.bots) {
            const userBots = Object.values(db.data.botHosting.bots)
                .filter(b => b.userId === userId);
            for (const b of userBots) {
                if (b.filePath) {
                    try { if (fs.existsSync(b.filePath)) fs.unlinkSync(b.filePath); } catch (e) {}
                }
                delete db.data.botHosting.bots[b.id];
            }
            // Recalculate botCounts
            if (db.data.botHosting.servers) {
                db.data.botHosting.servers.forEach(svr => {
                    svr.botCount = Object.values(db.data.botHosting.bots)
                        .filter(b => b.serverId === svr.id).length;
                });
            }
            // Clear pending uploads
            if (db.data.botHosting.pendingUploads) {
                delete db.data.botHosting.pendingUploads[userId];
            }
        }

        // 3. Remove SMM orders
        if (db.data.smmOrders) {
            db.data.smmOrders = db.data.smmOrders.filter(o => String(o.userId) !== userId);
        }

        // 4. Remove deposits
        if (db.data.deposits) {
            db.data.deposits = db.data.deposits.filter(d => String(d.userId) !== userId);
        }

        // 5. Remove support messages
        if (db.data.supportMessages) {
            delete db.data.supportMessages[userId];
        }

        // 6. Remove notifications
        if (db.data.notifications) {
            db.data.notifications = db.data.notifications.filter(n => String(n.userId) !== userId);
        }

        // 7. Delete the user
        delete users[userId];

        db.save();
        console.log(`[AUTO-DELETE] User ${userId} fully deleted (left all required chats)`);

    } catch (e) {
        console.error('[AUTO-DELETE] Delete error for', userId, ':', e.message);
    }
}

// ==================== END AUTO DELETE USER ON LEAVE ====================
