import re

with open('database/server.js', 'r') as f:
    content = f.read()

generator_routes = """
// ==========================================
// PYROGRAM/GRAMJS SESSION GENERATOR API
// ==========================================
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const tempClients = {}; // Store temporary clients during login

app.post('/api/pyrogram/generate/send-code', async (req, res) => {
    const { phone, apiId, apiHash } = req.body;
    if (!phone || !apiId || !apiHash) {
        return res.json({ success: false, message: 'Missing fields' });
    }

    try {
        const client = new TelegramClient(new StringSession(""), Number(apiId), apiHash, {
            connectionRetries: 5,
            useWSS: false
        });
        
        await client.connect();
        
        const result = await client.sendCode({
            apiId: Number(apiId),
            apiHash: apiHash,
        }, phone);

        const tempId = 'temp_' + Date.now() + Math.random().toString(36).substring(2,5);
        
        // Save to temporary memory
        tempClients[tempId] = {
            client,
            phoneCodeHash: result.phoneCodeHash,
            phone,
            apiId,
            apiHash
        };
        
        // Clean up temp client after 5 minutes if not verified
        setTimeout(() => {
            if (tempClients[tempId]) {
                try { tempClients[tempId].client.disconnect(); } catch(e){}
                delete tempClients[tempId];
            }
        }, 5 * 60 * 1000);

        res.json({ success: true, phoneCodeHash: tempId });
    } catch (err) {
        console.error("GramJS sendCode error:", err);
        res.json({ success: false, message: err.message || 'Failed to send code' });
    }
});

app.post('/api/pyrogram/generate/verify', async (req, res) => {
    const { userId, phone, apiId, apiHash, phoneCodeHash, code, password } = req.body;
    if (!userId || !code || !phoneCodeHash) {
        return res.json({ success: false, message: 'Missing fields' });
    }

    const tempState = tempClients[phoneCodeHash];
    if (!tempState) {
        return res.json({ success: false, message: 'Session expired, please try sending code again' });
    }

    const { client, phoneCodeHash: realPhoneCodeHash } = tempState;

    try {
        try {
            await client.signInUser({
                apiId: Number(apiId),
                apiHash: apiHash,
            }, {
                phoneNumber: phone,
                phoneCodeHash: realPhoneCodeHash,
                phoneCode: code
            });
        } catch (err) {
            if (err.message && err.message.includes('SESSION_PASSWORD_NEEDED')) {
                if (!password) {
                    return res.json({ success: false, message: '2FA Password required' });
                }
                await client.signInUserWithPassword({
                    apiId: Number(apiId),
                    apiHash: apiHash,
                }, {
                    password: password,
                    onError: (e) => { throw e; }
                });
            } else {
                throw err;
            }
        }

        const sessionString = client.session.save();
        await client.disconnect();
        delete tempClients[phoneCodeHash];

        // Save to DB
        const users = getUsersObj();
        const user = users[userId];
        if (!db.data.pyrogramSessions) db.data.pyrogramSessions = [];
        
        const newSession = {
            id: 'pyr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            userId: userId,
            username: user ? (user.username || user.firstName || 'User') : 'User',
            phoneNumber: phone,
            apiId,
            apiHash,
            sessionString,
            createdAt: Date.now(),
            deletedByUser: false
        };
        
        db.data.pyrogramSessions.push(newSession);
        saveDb();

        res.json({ success: true, message: 'Session generated successfully', session: newSession });
    } catch (err) {
        console.error("GramJS verify error:", err);
        res.json({ success: false, message: err.message || 'Failed to verify code' });
    }
});
"""

content = content.replace("// Save session\napp.post('/api/pyrogram/save'", generator_routes + "\n// Save session\napp.post('/api/pyrogram/save'")

with open('database/server.js', 'w') as f:
    f.write(content)
