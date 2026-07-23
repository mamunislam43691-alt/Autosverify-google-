const fs = require('fs');
let code = fs.readFileSync('./web/admin.html', 'utf8');

const navGroups = `<div class="nav-item" onclick="nav('groups')"><i class="fas fa-users-cog w-5 text-blue-400"></i> Group Management</div>`;
const navLivestream = `                <div class="nav-item" onclick="nav('livestream')"><i class="fas fa-video w-5 text-purple-400"></i> Video Chat & Music</div>`;

if(code.includes(navGroups) && !code.includes('nav(\'livestream\')')) {
    code = code.replace(navGroups, navGroups + '\n' + navLivestream);
}

const newPage = `
            <!-- LIVE STREAM & VIDEO CHAT -->
            <div id="page-livestream" class="page" style="display:none;">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold flex items-center gap-3">
                        <i class="fas fa-video text-purple-400"></i>
                        Video Chat & Music Manager
                    </h2>
                    <span class="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold border border-purple-500/30 flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                        USERBOT ENGINE ACTIVE
                    </span>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Control Panel -->
                    <div class="lg:col-span-2 space-y-6">
                        
                        <!-- Select Group to Stream -->
                        <div class="glass-card p-6 rounded-2xl border border-white/5">
                            <h3 class="font-bold mb-4 flex items-center gap-2">
                                <i class="fas fa-satellite-dish text-blue-400"></i> Target Stream Group
                            </h3>
                            <div class="flex gap-2 mb-4">
                                <select id="stream-group-select" class="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 focus:border-purple-500 outline-none text-sm">
                                    <option value="">Select a Group/Channel...</option>
                                </select>
                                <button onclick="refreshStreamGroups()" class="bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl hover:bg-blue-600/40 transition border border-blue-500/20">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <button onclick="startVideoChat()" class="bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(22,163,74,0.4)] flex flex-col items-center justify-center gap-2">
                                    <i class="fas fa-play text-2xl"></i>
                                    <span>Start Video Chat</span>
                                </button>
                                <button onclick="stopVideoChat()" class="bg-red-600/20 hover:bg-red-600/40 text-red-400 font-bold py-4 rounded-xl transition-all border border-red-500/20 flex flex-col items-center justify-center gap-2">
                                    <i class="fas fa-stop text-2xl"></i>
                                    <span>Stop Video Chat</span>
                                </button>
                            </div>
                        </div>

                        <!-- Music Player -->
                        <div class="glass-card p-6 rounded-2xl border border-purple-500/20 relative overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-black/50 pointer-events-none"></div>
                            
                            <div class="relative z-10 flex flex-col md:flex-row items-center gap-6">
                                <!-- Album Art Mock -->
                                <div class="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg relative overflow-hidden group">
                                    <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <i class="fas fa-upload text-white text-2xl"></i>
                                    </div>
                                    <i class="fas fa-music text-4xl text-white"></i>
                                </div>
                                
                                <div class="flex-1 w-full">
                                    <div class="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 class="font-bold text-lg text-white">Streaming Engine</h4>
                                            <p class="text-sm text-purple-400">Not playing</p>
                                        </div>
                                        <div class="flex gap-2">
                                            <button class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                                                <i class="fas fa-step-backward text-sm"></i>
                                            </button>
                                            <button class="w-10 h-10 rounded-full bg-purple-500 hover:bg-purple-400 text-white flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.5)] transition">
                                                <i class="fas fa-play text-sm ml-0.5"></i>
                                            </button>
                                            <button class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                                                <i class="fas fa-step-forward text-sm"></i>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <!-- Progress -->
                                    <div class="mt-4">
                                        <div class="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                                            <div class="h-full bg-purple-500 w-0"></div>
                                        </div>
                                        <div class="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>0:00</span>
                                            <span>0:00</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Source input -->
                                    <div class="mt-4 flex gap-2">
                                        <div class="relative flex-1">
                                            <i class="fab fa-youtube absolute left-3 top-1/2 -translate-y-1/2 text-red-500"></i>
                                            <input type="text" id="stream-url-input" placeholder="YouTube URL or search query..." class="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-sm focus:border-purple-500 outline-none">
                                        </div>
                                        <button class="bg-purple-600 text-white px-4 rounded-xl text-sm font-bold hover:bg-purple-500 transition">
                                            Play
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Side Panel -->
                    <div class="space-y-6">
                        <!-- Auto-Live Settings -->
                        <div class="glass-card p-6 rounded-2xl border border-white/5">
                            <h3 class="font-bold mb-4 flex items-center gap-2">
                                <i class="fas fa-robot text-teal-400"></i> Auto-Stream Settings
                            </h3>
                            <div class="space-y-3">
                                <div class="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                    <div>
                                        <div class="text-sm font-bold">Auto-Join Active</div>
                                        <div class="text-xs text-gray-400">Join voice chats when admins start them.</div>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="stream_autoJoin" class="sr-only peer" checked>
                                        <div class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                                    </label>
                                </div>
                                <div class="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                    <div>
                                        <div class="text-sm font-bold">Loop Music 24/7</div>
                                        <div class="text-xs text-gray-400">Automatically replay playlist.</div>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="stream_loopMusic" class="sr-only peer">
                                        <div class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                                    </label>
                                </div>
                                <button onclick="saveStreamSettings()" class="w-full bg-teal-600/20 text-teal-400 hover:bg-teal-600/30 border border-teal-500/20 py-2 rounded-xl text-sm font-bold mt-2 transition">
                                    Save Settings
                                </button>
                            </div>
                        </div>

                        <!-- Userbot Status -->
                        <div class="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full"></div>
                            <h3 class="font-bold mb-4 flex items-center gap-2 relative z-10">
                                <i class="fas fa-id-badge text-blue-400"></i> Stream Identity
                            </h3>
                            <div class="flex items-center gap-4 relative z-10">
                                <div class="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center border-2 border-blue-500">
                                    <i class="fas fa-user-astronaut text-xl text-blue-300"></i>
                                </div>
                                <div>
                                    <div class="font-bold text-sm">Online Income Admins</div>
                                    <div class="text-xs text-green-400 flex items-center gap-1">
                                        <i class="fas fa-check-circle"></i> Connected Userbot
                                    </div>
                                </div>
                            </div>
                            <div class="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                                To stream audio/video or start chats, the system uses an MTProto Userbot linked to this account.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
`;

// Insert the new page before the ending </div> of #app or after #page-serverlogs
const pageMarker = `            <div id="page-serverlogs" class="page">`;
if(code.includes(pageMarker)) {
    code = code.replace(pageMarker, newPage + '\n' + pageMarker);
} else {
    // Fallback: append before Pyrogram
    const pyrogramMarker = `            <div id="page-pyrogram" class="page">`;
    code = code.replace(pyrogramMarker, newPage + '\n' + pyrogramMarker);
}

const jsFuncs = `
        // --- Live Stream / Video Chat Manager ---
        function refreshStreamGroups() {
            const select = document.getElementById('stream-group-select');
            if(!select) return;
            
            // Re-use active groups from dashboard
            const tableBody = document.getElementById('groupsTableBody');
            if(tableBody) {
                const trs = tableBody.querySelectorAll('tr');
                let options = '<option value="">Select a Group/Channel...</option>';
                trs.forEach(tr => {
                    const idCell = tr.cells[2];
                    const nameCell = tr.cells[1];
                    if(idCell && nameCell) {
                        const id = idCell.innerText.trim();
                        const name = nameCell.innerText.trim();
                        options += \`<option value="\${id}">\${name}</option>\`;
                    }
                });
                select.innerHTML = options;
                showToast('Group list refreshed.');
            }
        }
        
        function startVideoChat() {
            const select = document.getElementById('stream-group-select');
            if(!select || !select.value) {
                showToast('⚠️ Please select a group first!', 'error');
                return;
            }
            
            // Mock API call
            showToast('🔄 Initializing Video Chat via Userbot...');
            setTimeout(() => {
                showToast('✅ Video Chat Started successfully!');
            }, 1500);
        }
        
        function stopVideoChat() {
            const select = document.getElementById('stream-group-select');
            if(!select || !select.value) {
                showToast('⚠️ Please select a group first!', 'error');
                return;
            }
            
            // Mock API call
            showToast('🔄 Stopping Video Chat...');
            setTimeout(() => {
                showToast('✅ Video Chat Stopped.');
            }, 1000);
        }
        
        function saveStreamSettings() {
            showToast('✅ Stream settings saved.');
        }
`;

code = code.replace('// --- Chart Initialization ---', jsFuncs + '\n        // --- Chart Initialization ---');

fs.writeFileSync('./web/admin.html', code);
console.log('Added livestream manager');
