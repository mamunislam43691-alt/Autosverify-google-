const fs = require('fs');
let code = fs.readFileSync('./web/admin.html', 'utf8');

// We want to add the Chart.js script before closing </head>
if (!code.includes('chart.js')) {
    code = code.replace('</head>', '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n</head>');
}

// Find the end of Main Stats Grid
const endGridIndex = code.indexOf('<!-- END of Dashboard Grids -->');
if (endGridIndex !== -1) {
    // we already have some marker? Let's check
}
