const fs = require('fs');
let code = fs.readFileSync('./database/server.js', 'utf8');

const regex = /app\.post\('\/api\/admin\/group-management', \(req, res\) => \{[\s\S]*?db\.save\(true\);/;

const replacement = `app.post('/api/admin/group-management', (req, res) => {
    const newSettings = req.body;
    if (!db.data.adminSettings) db.data.adminSettings = {};
    if (!db.data.adminSettings.groupManagement) db.data.adminSettings.groupManagement = {};
    if (!db.data.apiKeys) db.data.apiKeys = {};

    const { autoApproveJoinRequests, requireTelegram, userbotSessionString, userbotApiId, userbotApiHash, livestreamBotToken, ...rest } = newSettings;
    db.data.adminSettings.groupManagement = {
        ...db.data.adminSettings.groupManagement,
        ...rest
    };
    if (userbotSessionString !== undefined) {
        db.data.adminSettings.groupManagement.userbotSessionString = userbotSessionString;
    }
    if (userbotApiId !== undefined) {
        db.data.adminSettings.groupManagement.userbotApiId = userbotApiId;
    }
    if (userbotApiHash !== undefined) {
        db.data.adminSettings.groupManagement.userbotApiHash = userbotApiHash;
    }
    if (livestreamBotToken !== undefined) {
        db.data.adminSettings.groupManagement.livestreamBotToken = livestreamBotToken;
        db.data.apiKeys.livestreamBotToken = livestreamBotToken;
    }
    if (typeof autoApproveJoinRequests === 'boolean') {
        db.data.adminSettings.autoApproveJoinRequests = autoApproveJoinRequests;
        db.data.adminSettings.groupManagement.autoApproveJoinRequests = autoApproveJoinRequests;
    }
    if (typeof requireTelegram === 'boolean') {
        db.data.adminSettings.requireTelegram = requireTelegram;
    }
    db.save(true);`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('./database/server.js', code);
    console.log("Patched server.js group management POST endpoint successfully!");
} else {
    console.log("Regex did not match server.js");
}
