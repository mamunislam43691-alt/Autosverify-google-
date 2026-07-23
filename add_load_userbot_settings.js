const fs = require('fs');

let html = fs.readFileSync('./web/admin.html', 'utf8');

const target = "// STREAM ASSISTANT & USERBOT FUNCTIONS";
const addition = `
        async function loadUserbotSettings() {
            try {
                const res = await fetch('/api/admin/group-management');
                const data = await res.json();
                if (data.success && data.settings) {
                    const s = data.settings;
                    if (s.userbotSessionString) {
                        if (document.getElementById('ub-session-string')) document.getElementById('ub-session-string').value = s.userbotSessionString;
                        if (document.getElementById('gm_userbotSessionString')) document.getElementById('gm_userbotSessionString').value = s.userbotSessionString;
                    }
                    if (s.userbotApiId && document.getElementById('ub-api-id')) document.getElementById('ub-api-id').value = s.userbotApiId;
                    if (s.userbotApiHash && document.getElementById('ub-api-hash')) document.getElementById('ub-api-hash').value = s.userbotApiHash;
                    if (s.userbotEnabled === false) {
                        const badge1 = document.getElementById('ub-status-badge');
                        if (badge1) badge1.innerHTML = '🔴 DISCONNECTED';
                        const badge2 = document.getElementById('livestream-bot-status-badge');
                        if (badge2) badge2.innerHTML = '🔴 DISCONNECTED';
                    }
                }
            } catch(e) {
                console.error('Failed to load userbot settings:', e);
            }
        }
`;

if (html.includes(target)) {
    html = html.replace(target, target + addition);
    fs.writeFileSync('./web/admin.html', html);
    console.log("Added loadUserbotSettings function!");
} else {
    console.log("Target not found!");
}
