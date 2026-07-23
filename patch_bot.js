const fs = require('fs');
let code = fs.readFileSync('./bot.js', 'utf8');

// Replace scheduleAutoUnmute
const regex = /async function scheduleAutoUnmute\(chatId, user\) \{[\s\S]*?catch \(err\) \{/m;
const newFunc = `async function scheduleAutoUnmute(chatId, user) {
    if (!user || user.is_bot) return;
    
    const settings = db.data?.adminSettings?.groupManagement || {};
    if (settings.autoUnmuteNewUsers === false) {
        console.log(\`[AUTO-UNMUTE] Disabled in settings, skipping for user \${user.id}\`);
        return;
    }

    const key = \`\${chatId}_\${user.id}\`;
    if (unmutedUsersTracker.get(key)) return; // Only unmute once to respect manual admin mute afterwards
    
    unmutedUsersTracker.set(key, true);
    console.log(\`[AUTO-UNMUTE] User \${user.first_name || 'User'} (\${user.id}) joined/active in \${chatId}. Scheduling unmute in 60s...\`);

    setTimeout(async () => {
        try {
            // Check if user is still in the group and not banned/kicked
            const chatMember = await bot.getChatMember(chatId, user.id);
            if (['left', 'kicked', 'banned'].includes(chatMember.status)) {
                console.log(\`[AUTO-UNMUTE] User \${user.id} is no longer in chat \${chatId}, skipping.\`);
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
            console.log(\`[AUTO-UNMUTE] Successfully unrestricted/unmuted \${user.first_name || 'User'} (\${user.id}) in chat \${chatId}\`);
            
            // Removed the notification SMS based on user request.
        } catch (err) {`;

code = code.replace(regex, newFunc);
fs.writeFileSync('./bot.js', code);
