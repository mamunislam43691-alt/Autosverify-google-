const fs = require('fs');
let code = fs.readFileSync('./web/admin.html', 'utf8');

// Insert chart.js in head
if (!code.includes('chart.js')) {
    code = code.replace('</head>', '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n</head>');
}

// Identify where the dashboard grid ends (at line 1178ish)
// Let's replace:
/*
                        <div class="text-xl font-bold mt-1 text-rose-400" id="dash-ad-networks">...</div>
                    </div>
                </div>
*/
const searchBlock = `                        <div class="text-xl font-bold mt-1 text-rose-400" id="dash-ad-networks">...</div>
                    </div>
                </div>`;

const newBlock = `                        <div class="text-xl font-bold mt-1 text-rose-400" id="dash-ad-networks">...</div>
                    </div>
                </div>
                
                <!-- Live Analyst Chart & Features -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <!-- Chart Section -->
                    <div class="glass-card p-6 rounded-2xl lg:col-span-2 border border-blue-500/20">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-bold flex items-center gap-2">
                                <i class="fas fa-chart-area text-blue-400"></i> Live User Growth (7 Days)
                            </h3>
                            <button onclick="updateAnalystChart()" class="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg hover:bg-blue-500/30 transition">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                        <div class="relative h-64 w-full">
                            <canvas id="liveAnalystChart"></canvas>
                        </div>
                    </div>
                    
                    <!-- Quick Analytics Panel -->
                    <div class="glass-card p-6 rounded-2xl border border-purple-500/20 flex flex-col justify-between">
                        <div>
                            <h3 class="text-lg font-bold flex items-center gap-2 mb-4">
                                <i class="fas fa-brain text-purple-400"></i> AI Analyst Insights
                            </h3>
                            <div class="space-y-4">
                                <div class="bg-black/30 p-3 rounded-lg border-l-4 border-green-500">
                                    <h4 class="text-sm font-bold text-green-400 mb-1">High Engagement Time</h4>
                                    <p class="text-xs text-gray-300">Peak active users observed between 8 PM - 11 PM GMT.</p>
                                </div>
                                <div class="bg-black/30 p-3 rounded-lg border-l-4 border-blue-500">
                                    <h4 class="text-sm font-bold text-blue-400 mb-1">Top Performing Service</h4>
                                    <p class="text-xs text-gray-300">"Auto Unmute" feature enabled across 85% of active groups.</p>
                                </div>
                                <div class="bg-black/30 p-3 rounded-lg border-l-4 border-orange-500">
                                    <h4 class="text-sm font-bold text-orange-400 mb-1">Growth Prediction</h4>
                                    <p class="text-xs text-gray-300">Expected 15% increase in bot users next week based on current trend.</p>
                                </div>
                            </div>
                        </div>
                        <div class="mt-4">
                            <button class="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-2 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                                <i class="fas fa-magic mr-1"></i> Generate Deep Report
                            </button>
                        </div>
                    </div>
                </div>`;

if (code.includes(searchBlock)) {
    code = code.replace(searchBlock, newBlock);
}

// Add script to render chart
const scriptBlock = `
    let analystChartInstance = null;
    function initAnalystChart() {
        const ctx = document.getElementById('liveAnalystChart');
        if (!ctx) return;
        
        if (analystChartInstance) analystChartInstance.destroy();
        
        // Mock data for last 7 days
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const data = [120, 190, 300, 500, 450, 600, 850];
        
        analystChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'New Users',
                    data: data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#9ca3af' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#9ca3af' }
                    }
                }
            }
        });
    }
    
    function updateAnalystChart() {
        if (!analystChartInstance) return;
        // Generate random new data to simulate refresh
        const newData = Array.from({length: 7}, () => Math.floor(Math.random() * 1000) + 100);
        analystChartInstance.data.datasets[0].data = newData;
        analystChartInstance.update();
        showToast('Analyst chart data refreshed.');
    }

    // Call init on load
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initAnalystChart, 1000);
    });
`;

if (!code.includes('initAnalystChart')) {
    code = code.replace('</body>', '<script>' + scriptBlock + '</script>\n</body>');
}

fs.writeFileSync('./web/admin.html', code);
console.log('Added analyst chart');
