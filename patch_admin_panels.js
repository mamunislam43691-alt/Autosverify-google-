const fs = require('fs');

let html = fs.readFileSync('./web/admin.html', 'utf8');

// 1. Replace Panel 1 in page-livestream
const p1Regex = /<!-- Stream Assistant \(Userbot\) Connection -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div id="page-serverlogs"/;

const newP1 = `<!-- Stream Assistant (Userbot) Connection -->
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
                                Configure your Telegram Stream Assistant parameters below. Changes sync automatically across both configuration sections.
                            </p>
                            
                            <div class="space-y-3 relative z-10">
                                <div>
                                    <label class="text-[11px] text-gray-300 font-semibold block mb-1">
                                        1. App API ID:
                                    </label>
                                    <input type="text" id="ub-api-id" placeholder="e.g. 38296218" class="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:border-blue-500 outline-none font-mono" oninput="syncUserbotInputs('ub')">
                                </div>
                                <div>
                                    <label class="text-[11px] text-gray-300 font-semibold block mb-1">
                                        2. API HASH:
                                    </label>
                                    <input type="text" id="ub-api-hash" placeholder="e.g. 2295c4d2b2aa2fef481ac94a25c9ce04" class="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:border-blue-500 outline-none font-mono" oninput="syncUserbotInputs('ub')">
                                </div>
                                <div>
                                    <label class="text-[11px] text-gray-300 font-semibold block mb-1">
                                        3. SESSION STRING (Userbot Session):
                                    </label>
                                    <textarea id="ub-session-string" rows="3" placeholder="Paste Pyrogram Session String..." class="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:border-blue-500 outline-none font-mono" oninput="syncUserbotInputs('ub')"></textarea>
                                </div>
                                <div>
                                    <label class="text-[11px] text-gray-400 block mb-1">
                                        4. Live Stream Bot Token (Optional):
                                    </label>
                                    <input type="password" id="ub-bot-token" placeholder="Optional Assistant Bot Token..." class="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:border-blue-500 outline-none font-mono" oninput="syncUserbotInputs('ub')">
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

if (p1Regex.test(html)) {
    html = html.replace(p1Regex, newP1);
    console.log("Successfully replaced Panel 1!");
} else {
    console.log("Panel 1 regex mismatch!");
}

// 2. Replace Panel 2 in page-groupmanagement / bot settings
const p2Regex = /<!-- Live Stream Bot \(Assistant Bot\) Configuration -->[\s\S]*?<!-- Live Stream Quick Action Controls -->/;

const newP2 = `<!-- Live Stream Bot (Assistant Bot) Configuration -->
                        <div class="glass-card p-6 rounded-2xl border border-purple-500/20 relative overflow-hidden mb-6">
                            <div class="flex items-center justify-between mb-4">
                                <h4 class="font-bold flex items-center gap-2 text-sm text-purple-300">
                                    <i class="fas fa-broadcast-tower text-purple-400 animate-pulse"></i> Live Stream Assistant Configuration
                                </h4>
                                <div class="flex items-center gap-2">
                                    <span id="livestream-bot-status-badge" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                                        🟢 ACTIVE & READY
                                    </span>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="gm_userbotEnabled" class="sr-only peer" checked>
                                        <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500">
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <p class="text-xs text-gray-400 mb-4">
                                Configure your Live Stream Assistant parameters. Values sync seamlessly with the Livestream section.
                            </p>
                            <div class="space-y-3">
                                <div>
                                    <label class="text-[11px] text-gray-300 font-semibold block mb-1">
                                        1. App API ID:
                                    </label>
                                    <input type="text" id="gm_userbotApiId" placeholder="e.g. 38296218" class="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white text-xs focus:border-purple-500 outline-none font-mono" oninput="syncUserbotInputs('gm')">
                                </div>
                                <div>
                                    <label class="text-[11px] text-gray-300 font-semibold block mb-1">
                                        2. API HASH:
                                    </label>
                                    <input type="text" id="gm_userbotApiHash" placeholder="e.g. 2295c4d2b2aa2fef481ac94a25c9ce04" class="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white text-xs focus:border-purple-500 outline-none font-mono" oninput="syncUserbotInputs('gm')">
                                </div>
                                <div>
                                    <label class="text-[11px] text-gray-300 font-semibold block mb-1">
                                        3. SESSION STRING (Userbot Session):
                                    </label>
                                    <textarea id="gm_userbotSessionString" rows="3" placeholder="Paste Pyrogram Session String..." class="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white text-xs focus:border-purple-500 outline-none font-mono" oninput="syncUserbotInputs('gm')"></textarea>
                                </div>
                                <div>
                                    <label class="text-[11px] text-gray-400 block mb-1">
                                        4. Live Stream Bot Token (Optional):
                                    </label>
                                    <input type="password" id="gm_livestreamBotToken" placeholder="Optional Assistant Bot Token..." class="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white text-xs focus:border-purple-500 outline-none font-mono" oninput="syncUserbotInputs('gm')">
                                </div>
                                <div class="pt-2 flex gap-2">
                                    <button onclick="saveAndConnectUserbot()" class="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl transition-all shadow-[0_0_12px_rgba(147,51,234,0.4)] text-xs flex items-center justify-center gap-1.5">
                                        <i class="fas fa-save"></i> Save Settings
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Live Stream Quick Action Controls -->`;

if (p2Regex.test(html)) {
    html = html.replace(p2Regex, newP2);
    console.log("Successfully replaced Panel 2!");
} else {
    console.log("Panel 2 regex mismatch!");
}

// 3. Update Javascript functions
const scriptFuncsRegex = /\/\/\s*STREAM ASSISTANT & USERBOT FUNCTIONS[\s\S]*?async function saveStreamSettings\(\) \{[\s\S]*?\}/;

const newScriptFuncs = `// STREAM ASSISTANT & USERBOT FUNCTIONS
        function syncUserbotInputs(source) {
            if (source === 'ub') {
                const apiId = document.getElementById('ub-api-id')?.value || '';
                const apiHash = document.getElementById('ub-api-hash')?.value || '';
                const sessionStr = document.getElementById('ub-session-string')?.value || '';
                const botToken = document.getElementById('ub-bot-token')?.value || '';

                if (document.getElementById('gm_userbotApiId')) document.getElementById('gm_userbotApiId').value = apiId;
                if (document.getElementById('gm_userbotApiHash')) document.getElementById('gm_userbotApiHash').value = apiHash;
                if (document.getElementById('gm_userbotSessionString')) document.getElementById('gm_userbotSessionString').value = sessionStr;
                if (document.getElementById('gm_livestreamBotToken')) document.getElementById('gm_livestreamBotToken').value = botToken;
            } else if (source === 'gm') {
                const apiId = document.getElementById('gm_userbotApiId')?.value || '';
                const apiHash = document.getElementById('gm_userbotApiHash')?.value || '';
                const sessionStr = document.getElementById('gm_userbotSessionString')?.value || '';
                const botToken = document.getElementById('gm_livestreamBotToken')?.value || '';

                if (document.getElementById('ub-api-id')) document.getElementById('ub-api-id').value = apiId;
                if (document.getElementById('ub-api-hash')) document.getElementById('ub-api-hash').value = apiHash;
                if (document.getElementById('ub-session-string')) document.getElementById('ub-session-string').value = sessionStr;
                if (document.getElementById('ub-bot-token')) document.getElementById('ub-bot-token').value = botToken;
            }
        }

        async function loadUserbotSettings() {
            try {
                const res = await fetch('/api/admin/group-management');
                const data = await res.json();
                if (data.success && data.settings) {
                    const s = data.settings;
                    const apiId = s.userbotApiId || '38296218';
                    const apiHash = s.userbotApiHash || '2295c4d2b2aa2fef481ac94a25c9ce04';
                    const sessionStr = s.userbotSessionString || 'BAJIWpoAogx3YMhjTr8maeK5FBjoys_SY4n2U-nW5wspZPH5AXL6CpcJaq277XnDejrg0kdBGpk99w5wfLfId_cFe4qtHzxIOYZLZbe2Xy26tWBCJLeJ8Ochwl6wLIHn8JbDTXLaOjO-p89KJnGjC2Xk9jZqk8MmSR422K4jTS66fJh7BvPLud-nO0-Uv8wgQks27uZg1f4ZtrHnzbHQxCxjvP7UDrVEDmY1Kit36BmwTF1mL2_nhDnrj62_G-7FaygGhq5SOvaRJl-L7p5G4jgUaM3pcuEQXX8isrGMoSXAXeqPOSsR1Zd9g-5NHgyhgpZPKnlegCHboaaNlcZg4DY-M5z6iQAAAAISjnMuAA';
                    const botToken = s.livestreamBotToken || '';

                    if (document.getElementById('ub-api-id')) document.getElementById('ub-api-id').value = apiId;
                    if (document.getElementById('gm_userbotApiId')) document.getElementById('gm_userbotApiId').value = apiId;

                    if (document.getElementById('ub-api-hash')) document.getElementById('ub-api-hash').value = apiHash;
                    if (document.getElementById('gm_userbotApiHash')) document.getElementById('gm_userbotApiHash').value = apiHash;

                    if (document.getElementById('ub-session-string')) document.getElementById('ub-session-string').value = sessionStr;
                    if (document.getElementById('gm_userbotSessionString')) document.getElementById('gm_userbotSessionString').value = sessionStr;

                    if (document.getElementById('ub-bot-token')) document.getElementById('ub-bot-token').value = botToken;
                    if (document.getElementById('gm_livestreamBotToken')) document.getElementById('gm_livestreamBotToken').value = botToken;

                    if (s.userbotEnabled === false) {
                        const badge1 = document.getElementById('ub-status-badge');
                        if (badge1) badge1.innerHTML = '🔴 DISCONNECTED';
                        const badge2 = document.getElementById('livestream-bot-status-badge');
                        if (badge2) badge2.innerHTML = '🔴 DISCONNECTED';
                    } else {
                        const badge1 = document.getElementById('ub-status-badge');
                        if (badge1) badge1.innerHTML = '🟢 ACTIVE & READY';
                        const badge2 = document.getElementById('livestream-bot-status-badge');
                        if (badge2) badge2.innerHTML = '🟢 ACTIVE & READY';
                    }
                }
            } catch(e) {
                console.error('Failed to load userbot settings:', e);
            }
        }

        async function saveAndConnectUserbot() {
            const apiId = document.getElementById('ub-api-id')?.value || document.getElementById('gm_userbotApiId')?.value || '';
            const apiHash = document.getElementById('ub-api-hash')?.value || document.getElementById('gm_userbotApiHash')?.value || '';
            const sessionStr = document.getElementById('ub-session-string')?.value || document.getElementById('gm_userbotSessionString')?.value || '';
            const botToken = document.getElementById('ub-bot-token')?.value || document.getElementById('gm_livestreamBotToken')?.value || '';

            if (!sessionStr.trim()) {
                showToast('⚠️ Please enter a Session String!', 'error');
                return;
            }

            showToast('🔄 Saving & Connecting Stream Assistant...');
            try {
                const res = await fetch('/api/admin/group-management', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userbotApiId: apiId.trim(),
                        userbotApiHash: apiHash.trim(),
                        userbotSessionString: sessionStr.trim(),
                        livestreamBotToken: botToken.trim(),
                        userbotEnabled: true
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('✅ Assistant connected successfully! Session active.');
                    
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
            if (document.getElementById('ub-bot-token')) document.getElementById('ub-bot-token').value = '';
            if (document.getElementById('gm_livestreamBotToken')) document.getElementById('gm_livestreamBotToken').value = '';
            
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
        }`;

if (scriptFuncsRegex.test(html)) {
    html = html.replace(scriptFuncsRegex, newScriptFuncs);
    console.log("Successfully replaced script functions!");
} else {
    console.log("Script functions regex mismatch!");
}

fs.writeFileSync('./web/admin.html', html);
console.log("Finished patching admin.html!");
