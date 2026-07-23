const fs = require('fs');
let code = fs.readFileSync('./web/admin.html', 'utf8');

const accessControlUI = `
                        <!-- Access Control -->
                        <div class="glass-card p-4 md:p-6 rounded-2xl">
                            <h4 class="font-bold mb-4 flex items-center gap-2">
                                <i class="fas fa-users-cog text-cyan-400"></i> Access Control
                            </h4>
                            <div class="space-y-2 mb-4">
                                <div class="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                    <div>
                                        <div class="text-sm">Auto-Unmute New Users</div>
                                        <div class="text-xs text-gray-400">Automatically unmute users 1 minute after joining.</div>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="gm_autoUnmuteNewUsers" class="sr-only peer" checked>
                                        <div
                                            class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500">
                                        </div>
                                    </label>
                                </div>
                                <div class="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                    <div>
                                        <div class="text-sm">Global Chat Unlocked</div>
                                        <div class="text-xs text-gray-400">If ON, all users can talk. If OFF, chat is muted (locked) for everyone except admins.</div>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="gm_globalChatUnlocked" class="sr-only peer" checked>
                                        <div
                                            class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500">
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <button onclick="applyGlobalChatLock()" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-xl transition-all">
                                Apply Global Chat Lock Status Now
                            </button>
                        </div>
`;

code = code.replace("<!-- Anti-Spam -->", accessControlUI + "\n                        <!-- Anti-Spam -->");

const jsFuncs = `
        async function applyGlobalChatLock() {
            const unlock = document.getElementById('gm_globalChatUnlocked').checked;
            try {
                const res = await fetch('/api/admin/group-management/lock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ unlock })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('✅ ' + data.message);
                    saveGroupManagementSettings();
                } else {
                    showToast('❌ Failed: ' + data.message);
                }
            } catch (err) {
                showToast('❌ Error applying lock: ' + err.message);
            }
        }
`;

code = code.replace("async function saveGroupManagementSettings() {", jsFuncs + "\n        async function saveGroupManagementSettings() {");

// Add to settings load/save
code = code.replace("document.getElementById('gm_deleteUserLinks').checked = s.deleteUserLinks === true;", 
                    "document.getElementById('gm_autoUnmuteNewUsers').checked = s.autoUnmuteNewUsers !== false;\n                    document.getElementById('gm_globalChatUnlocked').checked = s.globalChatUnlocked !== false;\n                    document.getElementById('gm_deleteUserLinks').checked = s.deleteUserLinks === true;");

code = code.replace("autoDeleteSystemMessages: document.getElementById('gm_autoDeleteSystemMessages')?.checked || false,",
                    "autoUnmuteNewUsers: document.getElementById('gm_autoUnmuteNewUsers')?.checked !== false,\n                globalChatUnlocked: document.getElementById('gm_globalChatUnlocked')?.checked !== false,\n                autoDeleteSystemMessages: document.getElementById('gm_autoDeleteSystemMessages')?.checked || false,");

fs.writeFileSync('./web/admin.html', code);
