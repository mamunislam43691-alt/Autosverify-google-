with open('web/index.html', 'r') as f:
    content = f.read()

# 1. Add grid button in Grid Menu (home)
grid_btn = """
                    <div class="grid-btn" onclick="nav('pyrogram')">
                        <div class="grid-btn-icon" style="background: linear-gradient(135deg, #0ea5e9, #0284c7);"><i class="fas fa-robot"></i></div>
                        <div class="grid-btn-text">Pyrogram Bot</div>
                    </div>
"""
content = content.replace('<div class="grid-btn" onclick="nav(\'botHosting\')">', grid_btn + '\n                    <div class="grid-btn" onclick="nav(\'botHosting\')">')


# 2. Add Pyrogram page
page_html = """
        <!-- PYROGRAM PAGE -->
        <div id="pyrogramPage" class="page">
            <div class="content-body" style="padding: 0 16px 100px 16px;">
                <div style="background:linear-gradient(135deg,rgba(14,165,233,0.18),rgba(2,132,199,0.12)); border:1px solid rgba(14,165,233,0.35); border-radius:20px; padding:18px 18px 14px 18px; margin-top:16px; margin-bottom:16px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:46px; height:46px; border-radius:14px; background:linear-gradient(135deg,#0ea5e9,#0284c7); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 12px rgba(14,165,233,0.3);">
                            <i class="fas fa-robot" style="color:#fff; font-size:22px;"></i>
                        </div>
                        <div>
                            <h2 style="font-size:20px; font-weight:800; color:#fff; margin:0; line-height:1.2;">Pyrogram Session</h2>
                            <p style="font-size:12px; color:rgba(255,255,255,0.7); margin:4px 0 0 0; line-height:1.4;">Save your sessions easily for user bots</p>
                        </div>
                    </div>
                </div>

                <!-- Input Form -->
                <div class="neo-card" style="margin-bottom: 20px;">
                    <h3 style="font-size:16px; font-weight:700; color:#fff; margin-bottom:16px;">Add New Session</h3>
                    <div class="input-group">
                        <label>Phone Number (with code)</label>
                        <div class="input-with-icon">
                            <i class="fas fa-phone text-gray-400"></i>
                            <input type="text" id="pyroPhone" placeholder="+1234567890">
                        </div>
                    </div>
                    <div class="input-group">
                        <label>API ID</label>
                        <div class="input-with-icon">
                            <i class="fas fa-key text-gray-400"></i>
                            <input type="text" id="pyroApiId" placeholder="e.g. 123456">
                        </div>
                    </div>
                    <div class="input-group">
                        <label>API Hash</label>
                        <div class="input-with-icon">
                            <i class="fas fa-hashtag text-gray-400"></i>
                            <input type="text" id="pyroApiHash" placeholder="e.g. 0123456789abcdef0123456789abcdef">
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Session String</label>
                        <textarea id="pyroSession" class="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#0ea5e9] transition-colors" rows="4" placeholder="Enter your long session string here..."></textarea>
                    </div>
                    
                    <button onclick="savePyrogramSession()" style="width:100%; background:linear-gradient(135deg,#0ea5e9,#0284c7); color:white; border:none; border-radius:12px; padding:14px; font-size:14px; font-weight:800; cursor:pointer; margin-top:8px; box-shadow:0 4px 12px rgba(14,165,233,0.3);">
                        <i class="fas fa-save" style="margin-right:8px;"></i> Save Session
                    </button>
                </div>

                <!-- Saved Sessions List -->
                <div class="neo-card" style="margin-bottom: 20px;">
                    <h3 style="font-size:16px; font-weight:700; color:#fff; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
                        Saved Sessions
                        <button onclick="loadPyrogramSessions()" style="background:none; border:none; color:#0ea5e9; font-size:14px; cursor:pointer;"><i class="fas fa-sync-alt"></i></button>
                    </h3>
                    <div id="pyrogramList" style="display:flex; flex-direction:column; gap:12px;">
                        <!-- Loading... -->
                    </div>
                </div>

            </div>
        </div>
"""
content = content.replace('<div id="botHostingPage" class="page">', page_html + '\n        <div id="botHostingPage" class="page">')

with open('web/index.html', 'w') as f:
    f.write(content)
