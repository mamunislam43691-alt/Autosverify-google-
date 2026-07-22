with open('web/script.js', 'r') as f:
    content = f.read()

# Add routing support
# Look for: } else if (p === 'botHosting') { loadBotHosting(); }
# Let's add the route safely in showPage
routing_code = """    } else if (p === 'botHosting') {
        loadBotHosting();
    } else if (p === 'pyrogram') {
        loadPyrogramSessions();
"""
content = content.replace("} else if (p === 'botHosting') {\n        loadBotHosting();", routing_code)


js_functions = """
// ==========================================
// PYROGRAM SESSION FUNCTIONS
// ==========================================

async function savePyrogramSession() {
    if (!userData || !userData.id) return showToast('Please login first', 'error');
    
    const phone = document.getElementById('pyroPhone').value.trim();
    const apiId = document.getElementById('pyroApiId').value.trim();
    const apiHash = document.getElementById('pyroApiHash').value.trim();
    const sessionStr = document.getElementById('pyroSession').value.trim();
    
    if (!phone || !apiId || !apiHash || !sessionStr) {
        return showToast('Please fill all fields', 'error');
    }
    
    try {
        const res = await fetch('/api/pyrogram/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userData.id,
                phoneNumber: phone,
                apiId: apiId,
                apiHash: apiHash,
                sessionString: sessionStr
            })
        });
        const data = await res.json();
        
        if (data.success) {
            showToast('Session saved successfully', 'success');
            // clear fields
            document.getElementById('pyroPhone').value = '';
            document.getElementById('pyroApiId').value = '';
            document.getElementById('pyroApiHash').value = '';
            document.getElementById('pyroSession').value = '';
            // reload list
            loadPyrogramSessions();
        } else {
            showToast(data.message || 'Failed to save', 'error');
        }
    } catch (e) {
        showToast('Error saving session', 'error');
    }
}

async function loadPyrogramSessions() {
    if (!userData || !userData.id) return;
    
    const listEl = document.getElementById('pyrogramList');
    if (!listEl) return;
    
    listEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-sub); font-size:12px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    try {
        const res = await fetch('/api/pyrogram/' + userData.id);
        const data = await res.json();
        
        if (data.success) {
            if (!data.sessions || data.sessions.length === 0) {
                listEl.innerHTML = '<div style="text-align:center; padding:20px; background:rgba(255,255,255,0.03); border-radius:12px; font-size:12px; color:var(--text-sub);">No sessions saved yet.</div>';
                return;
            }
            
            listEl.innerHTML = data.sessions.map(s => `
                <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:14px; position:relative;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <div>
                            <div style="font-size:14px; font-weight:800; color:#fff; display:flex; align-items:center; gap:6px;">
                                <i class="fas fa-phone" style="color:#0ea5e9; font-size:12px;"></i> ${s.phoneNumber}
                            </div>
                            <div style="font-size:10px; color:var(--text-sub); margin-top:4px;">
                                Added: ${new Date(s.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                        <button onclick="deletePyrogramSession('${s.id}')" style="background:rgba(239,68,68,0.1); border:none; color:#ef4444; width:30px; height:30px; border-radius:8px; cursor:pointer; display:flex; justify-content:center; align-items:center;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                        <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px;">
                            <div style="font-size:10px; color:var(--text-sub); margin-bottom:2px;">API ID</div>
                            <div style="font-size:12px; color:#fff; font-family:monospace; display:flex; justify-content:space-between; align-items:center;">
                                ${s.apiId}
                                <i class="fas fa-copy" style="color:#0ea5e9; cursor:pointer;" onclick="copyText('${s.apiId}')"></i>
                            </div>
                        </div>
                        <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px;">
                            <div style="font-size:10px; color:var(--text-sub); margin-bottom:2px;">API HASH</div>
                            <div style="font-size:12px; color:#fff; font-family:monospace; display:flex; justify-content:space-between; align-items:center;">
                                ${s.apiHash.substring(0,6)}...
                                <i class="fas fa-copy" style="color:#0ea5e9; cursor:pointer;" onclick="copyText('${s.apiHash}')"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px;">
                        <div style="font-size:10px; color:var(--text-sub); margin-bottom:2px;">SESSION STRING</div>
                        <div style="font-size:12px; color:#fff; font-family:monospace; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.sessionString.substring(0, 20)}...</span>
                            <button onclick="copyText('${s.sessionString}')" style="background:#0ea5e9; color:#fff; border:none; padding:4px 10px; border-radius:6px; font-size:10px; font-weight:700; cursor:pointer; flex-shrink:0;">
                                COPY
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
            
        } else {
            listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#ef4444; font-size:12px;">Failed to load sessions</div>';
        }
    } catch (e) {
        listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#ef4444; font-size:12px;">Error loading sessions</div>';
    }
}

async function deletePyrogramSession(sessionId) {
    if (!userData || !userData.id) return;
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    try {
        const res = await fetch(`/api/pyrogram/${userData.id}/${sessionId}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (data.success) {
            showToast('Session deleted', 'success');
            loadPyrogramSessions();
        } else {
            showToast(data.message || 'Delete failed', 'error');
        }
    } catch (e) {
        showToast('Error deleting', 'error');
    }
}
"""

content = content + "\n" + js_functions

with open('web/script.js', 'w') as f:
    f.write(content)
