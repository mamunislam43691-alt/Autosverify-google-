const fs = require('fs');
let code = fs.readFileSync('./web/admin.html', 'utf8');

const searchUserbotStatus = `<!-- Userbot Status -->
                        <div class="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden">`;

const newUserbotStatus = `<!-- Userbot Configuration -->
                        <div class="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full"></div>
                            <h3 class="font-bold mb-4 flex items-center gap-2 relative z-10">
                                <i class="fas fa-id-badge text-blue-400"></i> Stream Assistant (Userbot)
                            </h3>
                            
                            <div id="userbot-status-disconnected" class="relative z-10">
                                <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 mb-4">
                                    <i class="fas fa-exclamation-triangle"></i> Telegram Bots cannot start Voice Chats. You MUST connect a Userbot (Assistant Account).
                                </div>
                                <div class="space-y-3">
                                    <input type="text" id="ub-api-id" placeholder="API ID (e.g. 1234567)" class="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-sm focus:border-blue-500 outline-none">
                                    <input type="text" id="ub-api-hash" placeholder="API HASH" class="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-sm focus:border-blue-500 outline-none">
                                    <input type="text" id="ub-phone" placeholder="Phone Number (e.g. +8801...)" class="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-sm focus:border-blue-500 outline-none">
                                    <button onclick="requestUserbotCode()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)]">
                                        Send Login Code
                                    </button>
                                </div>
                            </div>
                            
                            <!-- OTP Step -->
                            <div id="userbot-status-otp" class="relative z-10 hidden">
                                <div class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 mb-4">
                                    <i class="fas fa-info-circle"></i> We sent an OTP to your Telegram account.
                                </div>
                                <div class="space-y-3">
                                    <input type="text" id="ub-otp" placeholder="Enter OTP (e.g. 12345)" class="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-sm focus:border-blue-500 outline-none">
                                    <button onclick="submitUserbotCode()" class="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-xl transition-all shadow-[0_0_10px_rgba(22,163,74,0.3)]">
                                        Verify & Connect
                                    </button>
                                </div>
                            </div>

                            <!-- Connected Step -->
                            <div id="userbot-status-connected" class="relative z-10 hidden">
                                <div class="flex items-center gap-4">
                                    <div class="w-12 h-12 rounded-full bg-green-900 flex items-center justify-center border-2 border-green-500">
                                        <i class="fas fa-user-astronaut text-xl text-green-300"></i>
                                    </div>
                                    <div>
                                        <div class="font-bold text-sm">Assistant Connected</div>
                                        <div class="text-xs text-green-400 flex items-center gap-1">
                                            <i class="fas fa-check-circle"></i> Ready to Stream
                                        </div>
                                    </div>
                                </div>
                                <button onclick="disconnectUserbot()" class="w-full mt-4 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/20 font-bold py-2 rounded-xl transition-all text-sm">
                                    Disconnect Assistant
                                </button>
                            </div>
                        </div>`;

const searchFunc = `        function saveStreamSettings() {
            showToast('✅ Stream settings saved.');
        }`;

const newFuncs = `        function saveStreamSettings() {
            showToast('✅ Stream settings saved.');
        }

        function requestUserbotCode() {
            const apiId = document.getElementById('ub-api-id').value;
            const apiHash = document.getElementById('ub-api-hash').value;
            const phone = document.getElementById('ub-phone').value;
            if(!apiId || !apiHash || !phone) {
                showToast('⚠️ Please enter API ID, HASH, and Phone.', 'error');
                return;
            }
            showToast('🔄 Sending OTP to Telegram...');
            // Simulating API Call
            setTimeout(() => {
                document.getElementById('userbot-status-disconnected').classList.add('hidden');
                document.getElementById('userbot-status-otp').classList.remove('hidden');
                showToast('✅ OTP Sent! Please check your Telegram.');
            }, 1500);
        }

        function submitUserbotCode() {
            const otp = document.getElementById('ub-otp').value;
            if(!otp) {
                showToast('⚠️ Please enter the OTP code.', 'error');
                return;
            }
            showToast('🔄 Verifying OTP...');
            // Simulating connection
            setTimeout(() => {
                document.getElementById('userbot-status-otp').classList.add('hidden');
                document.getElementById('userbot-status-connected').classList.remove('hidden');
                showToast('✅ Userbot Connected Successfully!');
                document.querySelector('#page-livestream span.text-purple-400').innerHTML = '<div class="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div> USERBOT ENGINE ACTIVE';
            }, 2000);
        }

        function disconnectUserbot() {
            if(confirm("Are you sure you want to disconnect the assistant? Live streams will stop.")) {
                document.getElementById('userbot-status-connected').classList.add('hidden');
                document.getElementById('userbot-status-disconnected').classList.remove('hidden');
                document.querySelector('#page-livestream span.text-purple-400').innerHTML = '<div class="w-2 h-2 rounded-full bg-red-400"></div> USERBOT OFFLINE';
                showToast('🔌 Assistant Disconnected.');
            }
        }`;

// Replace status area
const regexStatus = /<!-- Userbot Status -->[\s\S]*?To stream audio\/video or start chats, the system uses an MTProto Userbot linked to this account.\n                            <\/div>\n                        <\/div>/;
if (regexStatus.test(code)) {
    code = code.replace(regexStatus, newUserbotStatus);
    code = code.replace(searchFunc, newFuncs);
    fs.writeFileSync('./web/admin.html', code);
    console.log("Updated Userbot Auth UI");
} else {
    console.log("Regex did not match");
}
