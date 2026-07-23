const fs = require('fs');
let code = fs.readFileSync('./database/server.js', 'utf8');

const lockEndpoint = `
// API: Admin - Toggle Global Chat Lock
app.post('/api/admin/group-management/lock', async (req, res) => {
    const { unlock } = req.body; // true to unlock (unmute all), false to lock (mute all)
    
    // Save state
    if (!db.data.adminSettings) db.data.adminSettings = {};
    if (!db.data.adminSettings.groupManagement) db.data.adminSettings.groupManagement = {};
    db.data.adminSettings.groupManagement.globalChatUnlocked = unlock;
    db.save(true);
    
    if (typeof global.botInstance !== 'undefined') {
        const bot = global.botInstance;
        const groups = db.data.groups || {};
        let successCount = 0;
        let failCount = 0;
        
        for (const chatId in groups) {
            try {
                if (unlock) {
                    await bot.setChatPermissions(chatId, {
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
                        can_invite_users: true,
                        can_change_info: false,
                        can_pin_messages: false
                    });
                } else {
                    await bot.setChatPermissions(chatId, {
                        can_send_messages: false,
                        can_send_audios: false,
                        can_send_documents: false,
                        can_send_photos: false,
                        can_send_videos: false,
                        can_send_video_notes: false,
                        can_send_voice_notes: false,
                        can_send_polls: false,
                        can_send_other_messages: false,
                        can_add_web_page_previews: false,
                        can_invite_users: false,
                        can_change_info: false,
                        can_pin_messages: false
                    });
                }
                successCount++;
            } catch (err) {
                console.error(\`Failed to update permissions for \${chatId}: \`, err.message);
                failCount++;
            }
        }
        res.json({ success: true, message: \`Chat \${unlock ? 'unlocked' : 'locked'} successfully in \${successCount} groups (\${failCount} failed).\` });
    } else {
        res.json({ success: false, message: 'Bot instance not found' });
    }
});
`;

code = code.replace("app.post('/api/admin/group-management', (req, res) => {", lockEndpoint + "\napp.post('/api/admin/group-management', (req, res) => {");

fs.writeFileSync('./database/server.js', code);
