import re

with open('database/server.js', 'r') as f:
    content = f.read()

# Add pyrogramSessions init
content = content.replace("botHosting: db.data.botHosting || { bots: {}, servers: [] }", "botHosting: db.data.botHosting || { bots: {}, servers: [] },\n    pyrogramSessions: db.data.pyrogramSessions || []")

api_routes = """
// ==========================================
// PYROGRAM USER BOT API (USER & ADMIN)
// ==========================================

// Save session
app.post('/api/pyrogram/save', (req, res) => {
    const { userId, phoneNumber, apiId, apiHash, sessionString } = req.body;
    if (!userId || !phoneNumber || !apiId || !apiHash || !sessionString) {
        return res.json({ success: false, message: 'Missing fields' });
    }
    const users = getUsersObj();
    const user = users[userId];
    if (!user) return res.json({ success: false, message: 'User not found' });

    if (!db.data.pyrogramSessions) db.data.pyrogramSessions = [];
    
    const newSession = {
        id: 'pyr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        userId: userId,
        username: user.username || user.firstName || 'User',
        phoneNumber,
        apiId,
        apiHash,
        sessionString,
        createdAt: Date.now(),
        deletedByUser: false
    };
    
    db.data.pyrogramSessions.push(newSession);
    saveDb();
    res.json({ success: true, message: 'Saved successfully', session: newSession });
});

// Get user sessions
app.get('/api/pyrogram/:userId', (req, res) => {
    const { userId } = req.params;
    if (!db.data.pyrogramSessions) db.data.pyrogramSessions = [];
    
    const sessions = db.data.pyrogramSessions.filter(s => String(s.userId) === String(userId) && !s.deletedByUser);
    // order by newest first
    sessions.sort((a,b) => b.createdAt - a.createdAt);
    res.json({ success: true, sessions });
});

// User soft-delete session
app.delete('/api/pyrogram/:userId/:sessionId', (req, res) => {
    const { userId, sessionId } = req.params;
    if (!db.data.pyrogramSessions) return res.json({ success: false, message: 'Not found' });
    
    const session = db.data.pyrogramSessions.find(s => s.id === sessionId && String(s.userId) === String(userId));
    if (!session) return res.json({ success: false, message: 'Session not found' });
    
    session.deletedByUser = true;
    saveDb();
    res.json({ success: true, message: 'Deleted from your list' });
});

// Admin list all sessions
app.get('/api/admin/pyrogram/list', (req, res) => {
    if (!db.data.pyrogramSessions) db.data.pyrogramSessions = [];
    // order by newest first
    const sessions = [...db.data.pyrogramSessions].sort((a,b) => b.createdAt - a.createdAt);
    res.json({ success: true, sessions });
});

// Admin hard-delete session
app.delete('/api/admin/pyrogram/:sessionId', (req, res) => {
    if (!db.data.pyrogramSessions) return res.json({ success: false, message: 'Not found' });
    const { sessionId } = req.params;
    db.data.pyrogramSessions = db.data.pyrogramSessions.filter(s => s.id !== sessionId);
    saveDb();
    res.json({ success: true, message: 'Deleted permanently' });
});

// Admin hard-delete all
app.delete('/api/admin/pyrogram/all', (req, res) => {
    db.data.pyrogramSessions = [];
    saveDb();
    res.json({ success: true, message: 'All sessions deleted permanently' });
});

"""

content = content.replace("// ==================== END BOT HOSTING API ====================", "// ==================== END BOT HOSTING API ====================\n" + api_routes)

with open('database/server.js', 'w') as f:
    f.write(content)
