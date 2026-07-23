const fs = require('fs');
let code = fs.readFileSync('./web/admin.html', 'utf8');

const oldHeader = `
            <div id="page-dashboard" class="page active">
                <!-- Main Stats Grid -->
`;

const newHeader = `
            <div id="page-dashboard" class="page active">
                
                <!-- Dashboard Hero Section -->
                <div class="relative overflow-hidden rounded-3xl p-8 mb-8 bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-black border border-white/10 shadow-2xl">
                    <div class="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                        <i class="fas fa-chart-network text-9xl text-white"></i>
                    </div>
                    <div class="relative z-10">
                        <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">Welcome to Command Center</h2>
                        <p class="text-gray-300 mb-6 max-w-2xl">Monitor your bot network, track active users, analyze growth, and manage live streams in real-time. Use the AI analyst tools to generate actionable insights.</p>
                        
                        <div class="flex flex-wrap gap-4">
                            <button onclick="nav('groups')" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2">
                                <i class="fas fa-users"></i> Manage Groups
                            </button>
                            <button onclick="nav('settings')" class="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-5 rounded-xl transition-all border border-white/10 flex items-center gap-2">
                                <i class="fas fa-cogs"></i> System Settings
                            </button>
                            <button onclick="nav('broadcast')" class="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-5 rounded-xl transition-all border border-white/10 flex items-center gap-2">
                                <i class="fas fa-bullhorn"></i> New Broadcast
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Main Stats Grid -->
`;

if (code.includes(oldHeader)) {
    code = code.replace(oldHeader, newHeader);
    fs.writeFileSync('./web/admin.html', code);
    console.log("Updated header");
} else {
    console.log("Header not found");
}

