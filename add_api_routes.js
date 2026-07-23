const fs = require('fs');
let code = fs.readFileSync('./database/server.js', 'utf8');

const importStatement = `const database = require('./database.js');\nconst { startUserbot, startVoiceChat, joinVoiceChat } = require('../userbot.js');`;

const oldImport = `const database = require('./database.js');`;
if(code.includes(oldImport)) {
    code = code.replace(oldImport, importStatement);
}

const apiRoutes = `
// --- USERBOT API ROUTES ---
app.post('/api/userbot/connect', async (req, res) => {
    // In a real app this would send OTP.
    res.json({ success: true, message: 'OTP Sent' });
});

app.post('/api/userbot/verify', async (req, res) => {
    // In a real app this would verify OTP.
    res.json({ success: true, message: 'Connected' });
});

app.post('/api/userbot/start_voice_chat', async (req, res) => {
    const { chatId } = req.body;
    // Simulate starting voice chat
    setTimeout(() => {
        res.json({ success: true, message: 'Voice chat started' });
    }, 1500);
});

app.post('/api/userbot/stop_voice_chat', async (req, res) => {
    // Simulate stopping voice chat
    setTimeout(() => {
        res.json({ success: true, message: 'Voice chat stopped' });
    }, 1000);
});

app.post('/api/userbot/play_music', async (req, res) => {
    // Simulate streaming
    setTimeout(() => {
        res.json({ success: true, message: 'Streaming audio...' });
    }, 2000);
});

`;

const marker = `// Add a dedicated route for Telegram webhooks`;
if(code.includes(marker)) {
    code = code.replace(marker, apiRoutes + '\n' + marker);
}

fs.writeFileSync('./database/server.js', code);
console.log("Added mock API routes for userbot UI");
