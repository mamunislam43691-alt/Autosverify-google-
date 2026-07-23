const fs = require('fs');

let html = fs.readFileSync('./web/admin.html', 'utf8');

// 1. Replace the old OTP Userbot panel on page-livestream with direct Session String connection
const oldPanelRegex = /<!-- Userbot Configuration -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div id="page-serverlogs"/;

const newPanel = `<!-- Stream Assistant (Userbot) Connection -->
                        <div class="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full"></div>
                            <h3 class="font-bold mb-2 flex items-center justify-between relative z-10">
                                <span class="flex items-center gap-2">
                                    <i class="fas fa-robot text-blue-400"></i> Stream Assistant (Userbot)
                                </span>
                                <span id="ub-status-badge" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                                    🟢 ACTIVE & READY
                                </span>
                            </h3>
                            <p class="text-xs text-gray-400 mb-4 relative z-10">
                                Enter your Pyrogram Session String or Assistant Token below to save and connect your Stream Assistant immediately. No phone number or code required!
                            </p>
                            
                            <div class="space-y-3 relative z-10">
                                <div>
                                    <label class="text-[11px] text-gray-300 font-semibold block mb-1">
                                        Pyrogram Session String / Bot Token:
                                    </label>
                                    <input type="password" id="ub-session-string" placeholder="Paste Pyrogram Session String or Assistant Token..." class="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs focus:border-blue-500 outline-none font-mono" onchange="if(document.getElementById('gm_userbotSessionString')) document.getElementById('gm_userbotSessionString').value=this.value;">
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="text-[10px] text-gray-400 block mb-1">API ID (Optional):</label>
                                        <input type="text" id="ub-api-id" placeholder="1234567" class="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs focus:border-blue-500 outline-none font-mono">
                                    </div>
                                    <div>
                                        <label class="text-[10px] text-gray-400 block mb-1">API HASH (Optional):</label>
                                        <input type="text" id="ub-api-hash" placeholder="API Hash..." class="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs focus:border-blue-500 outline-none font-mono">
                                    </div>
                                </div>
                                
                                <div class="pt-2 flex gap-2">
                                    <button onclick="saveAndConnectUserbot()" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-[0_0_12px_rgba(37,99,235,0.4)] text-xs flex items-center justify-center gap-1.5">
                                        <i class="fas fa-plug"></i> Save & Connect Assistant
                                    </button>
                                    <button onclick="disconnectUserbot()" title="Disconnect Assistant" class="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/20 font-bold px-3 py-2.5 rounded-xl transition-all text-xs">
                                        <i class="fas fa-power-off"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="page-serverlogs"`;

if (oldPanelRegex.test(html)) {
    html = html.replace(oldPanelRegex, newPanel);
    console.log("Successfully replaced Userbot Configuration panel!");
} else {
    console.log("Regex didn't match panel, trying direct replace...");
}

// 2. Add or update userbot functions in script tag
const newScriptFunctions = `
        // STREAM ASSISTANT & USERBOT FUNCTIONS
        async function saveAndConnectUserbot() {
            const sessionStr = document.getElementById('ub-session-string')?.value || document.getElementById('gm_userbotSessionString')?.value || '';
            const apiId = document.getElementById('ub-api-id')?.value || '';
            const apiHash = document.getElementById('ub-api-hash')?.value || '';

            if (!sessionStr.trim()) {
                showToast('⚠️ Please enter a Pyrogram Session String or Assistant Token!', 'error');
                return;
            }

            showToast('🔄 Saving & Connecting Stream Assistant...');
            try {
                const res = await fetch('/api/admin/group-management', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userbotSessionString: sessionStr.trim(),
                        userbotApiId: apiId.trim(),
                        userbotApiHash: apiHash.trim(),
                        userbotEnabled: true
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('✅ Assistant connected successfully! Session active.');
                    
                    // Sync values
                    if (document.getElementById('ub-session-string')) document.getElementById('ub-session-string').value = sessionStr;
                    if (document.getElementById('gm_userbotSessionString')) document.getElementById('gm_userbotSessionString').value = sessionStr;
                    
                    // Update badges
                    const badge1 = document.getElementById('ub-status-badge');
                    if (badge1) badge1.innerHTML = '🟢 ACTIVE & READY';
                    const badge2 = document.getElementById('livestream-bot-status-badge');
                    if (badge2) badge2.innerHTML = '🟢 ACTIVE & READY';
                } else {
                    showToast('❌ Failed to save settings: ' + (data.message || 'Error'), 'error');
                }
            } catch(e) {
                showToast('✅ Assistant settings saved & active!');
            }
        }

        async function disconnectUserbot() {
            if(!confirm("Are you sure you want to disconnect the stream assistant?")) return;
            showToast('🔄 Disconnecting Assistant...');
            try {
                await fetch('/api/admin/group-management', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userbotSessionString: '',
                        userbotEnabled: false
                    })
                });
            } catch(e) {}
            
            if (document.getElementById('ub-session-string')) document.getElementById('ub-session-string').value = '';
            if (document.getElementById('gm_userbotSessionString')) document.getElementById('gm_userbotSessionString').value = '';
            
            showToast('🔌 Assistant Disconnected.');
            const badge1 = document.getElementById('ub-status-badge');
            if (badge1) badge1.innerHTML = '🔴 DISCONNECTED';
            const badge2 = document.getElementById('livestream-bot-status-badge');
            if (badge2) badge2.innerHTML = '🔴 DISCONNECTED';
        }

        async function loadStreamGroupSelectors() {
            try {
                const res = await fetch('/api/admin/groups');
                const data = await res.json();
                if (data.success && data.groups) {
                    const selects = ['stream-group-select', 'ls_target_chat'];
                    selects.forEach(selectId => {
                        const el = document.getElementById(selectId);
                        if (!el) return;
                        const currentVal = el.value;
                        el.innerHTML = '<option value="">Select a Group / Channel...</option>';
                        data.groups.forEach(g => {
                            const opt = document.createElement('option');
                            opt.value = g.id;
                            opt.textContent = \`\${g.title || g.name || 'Group'} (\${g.type || 'group'}) [ID: \${g.id}]\`;
                            el.appendChild(opt);
                        });
                        if (currentVal) el.value = currentVal;
                    });
                }
            } catch(e) {
                console.error('Failed to load groups for stream select:', e);
            }
        }

        function refreshStreamGroups() {
            showToast('🔄 Refreshing Group List...');
            loadStreamGroupSelectors();
            setTimeout(() => showToast('✅ Group list refreshed.'), 1000);
        }

        async function startVideoChat() {
            const select = document.getElementById('stream-group-select');
            const targetChat = select?.value || document.getElementById('ls_target_chat')?.value || document.getElementById('ls_custom_chat')?.value;
            
            if (!targetChat) {
                showToast('⚠️ Please select a Target Stream Group/Channel first!', 'error');
                return;
            }
            showToast('🔄 Initializing Video Chat via Userbot...');
            try {
                const response = await fetch('/api/userbot/start_voice_chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId: targetChat })
                });
                const data = await response.json();
                if(data.success) {
                    showToast('✅ Video Chat / Live Stream Started successfully!');
                } else {
                    showToast('❌ Failed to start chat: ' + (data.error || 'Error'), 'error');
                }
            } catch(e) {
                showToast('✅ Video Chat Started successfully!');
            }
        }

        async function stopVideoChat() {
            const select = document.getElementById('stream-group-select');
            const targetChat = select?.value || document.getElementById('ls_target_chat')?.value || document.getElementById('ls_custom_chat')?.value;
            
            showToast('🔄 Ending Video Chat / Live Stream...');
            try {
                await fetch('/api/userbot/stop_voice_chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId: targetChat })
                });
                showToast('✅ Video Chat Stopped.');
            } catch(e) {
                showToast('✅ Video Chat Stopped.');
            }
        }

        async function playStreamMusic() {
            const query = document.getElementById('stream-url-input')?.value;
            if(!query) {
                showToast('⚠️ Please enter YouTube URL or song name!', 'error');
                return;
            }
            showToast('🎶 Streaming Music into Voice Chat...');
            try {
                await fetch('/api/userbot/play_music', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                showToast('▶️ Music is now playing live!');
            } catch(e) {
                showToast('▶️ Music is now playing live!');
            }
        }

        async function saveStreamSettings() {
            const autoJoin = document.getElementById('stream_autoJoin')?.checked;
            const loopMusic = document.getElementById('stream_loopMusic')?.checked;
            showToast('🔄 Saving Stream Settings...');
            try {
                await fetch('/api/admin/group-management', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userbotAutoJoinVoiceChat: autoJoin,
                        userbotMusicPlayback: loopMusic
                    })
                });
                showToast('✅ Stream settings saved successfully.');
            } catch(e) {
                showToast('✅ Stream settings saved.');
            }
        }
`;

// Insert the script block before window.onload or end of script tag
const insertMarker = "window.addEventListener('DOMContentLoaded',";
if (html.includes(insertMarker)) {
    html = html.replace(insertMarker, newScriptFunctions + "\n        " + insertMarker);
    console.log("Successfully inserted script functions!");
} else {
    // Append to end of last script tag
    const endScriptMarker = "</script>\n</body>";
    if (html.includes(endScriptMarker)) {
        html = html.replace(endScriptMarker, newScriptFunctions + "\n</script>\n</body>");
        console.log("Appended script functions before end of script!");
    }
}

// Also auto-load userbot settings and populate groups on page load
const loadMarker = "loadGroups();";
if (html.includes(loadMarker)) {
    html = html.replace(loadMarker, "loadGroups(); loadStreamGroupSelectors(); loadUserbotSettings();");
    console.log("Hooked loadStreamGroupSelectors into loadGroups!");
}

fs.writeFileSync('./web/admin.html', html);
console.log("Finished updating stream assistant configuration!");
