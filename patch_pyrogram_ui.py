with open('web/index.html', 'r') as f:
    content = f.read()

import re

# Swap the grid buttons
grid_buttons = """                    <div class="grid-btn" onclick="nav('botHosting')">
                        <div class="grid-btn-icon" style="background: linear-gradient(135deg, #7c3aed, #5b21b6);"><i class="fas fa-rocket"></i></div>
                        <div class="grid-btn-text">Bot Hosting</div>
                    </div>

                    <div class="grid-btn" onclick="nav('pyrogram')">
                        <div class="grid-btn-icon" style="background: linear-gradient(135deg, #0ea5e9, #0284c7);"><i class="fas fa-robot"></i></div>
                        <div class="grid-btn-text">Pyrogram Bot</div>
                    </div>"""

content = re.sub(r'<div class="grid-btn" onclick="nav\(\'pyrogram\'\)[\s\S]*?<div class="grid-btn" onclick="nav\(\'botHosting\'\)[\s\S]*?</div>\s*</div>\s*</div>', grid_buttons + "\n                </div>", content)

pyrogram_page = """        <!-- PYROGRAM PAGE -->
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
                <div style="background:var(--bg-card); border-radius:16px; padding:20px; margin-bottom:16px;">
                    <h3 style="font-size:16px; font-weight:800; color:var(--text-main); margin-bottom:20px;">Add New Session</h3>
                    
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">Phone Number (with code)</label>
                        <div style="position:relative;">
                            <i class="fas fa-phone" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); font-size:14px;"></i>
                            <input type="text" id="pyroPhone" placeholder="+1234567890" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 12px 12px 40px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">API ID</label>
                        <div style="position:relative;">
                            <i class="fas fa-key" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); font-size:14px;"></i>
                            <input type="text" id="pyroApiId" placeholder="e.g. 123456" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 12px 12px 40px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">API Hash</label>
                        <div style="position:relative;">
                            <i class="fas fa-hashtag" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); font-size:14px;"></i>
                            <input type="text" id="pyroApiHash" placeholder="e.g. 0123456789abcdef0123456789abcdef" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 12px 12px 40px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                    </div>

                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">Session String</label>
                        <textarea id="pyroSession" rows="3" placeholder="Enter your long session string here..." style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; color:#fff; font-size:14px; outline:none; transition:0.3s; resize:none;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'"></textarea>
                    </div>
                    
                    <button onclick="savePyrogramSession()" style="width:100%; background:linear-gradient(135deg,#0ea5e9,#0284c7); color:white; border:none; border-radius:12px; padding:14px; font-size:15px; font-weight:800; cursor:pointer; margin-top:4px; box-shadow:0 4px 12px rgba(14,165,233,0.3); transition:0.2s;" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">
                        <i class="fas fa-save" style="margin-right:8px;"></i> Save Session
                    </button>
                </div>

                <!-- Saved Sessions List -->
                <div style="background:var(--bg-card); border-radius:16px; padding:20px; margin-bottom:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h3 style="font-size:16px; font-weight:800; color:var(--text-main); margin:0;">Saved Sessions</h3>
                        <button onclick="loadPyrogramSessions()" style="background:none; border:none; color:#0ea5e9; font-size:16px; cursor:pointer; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:8px; transition:0.2s; background:rgba(14,165,233,0.1);" title="Refresh">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                    <div id="pyrogramList" style="display:flex; flex-direction:column; gap:12px;">
                        <!-- Loading... -->
                    </div>
                </div>

            </div>
        </div>"""

content = re.sub(r'<!-- PYROGRAM PAGE -->[\s\S]*?<div id="botHostingPage"', pyrogram_page + '\n\n        <div id="botHostingPage"', content)

with open('web/index.html', 'w') as f:
    f.write(content)
