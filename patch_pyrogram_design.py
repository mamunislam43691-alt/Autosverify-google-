import re

with open('web/index.html', 'r') as f:
    content = f.read()

new_pyrogram_page = """
        <!-- PYROGRAM PAGE -->
        <div id="pyrogramPage" class="page">
            <div class="content-body" style="padding: 0 16px 100px 16px;">
                <!-- Header -->
                <div style="background:linear-gradient(135deg,rgba(14,165,233,0.18),rgba(2,132,199,0.12)); border:1px solid rgba(14,165,233,0.35); border-radius:20px; padding:18px 18px 14px 18px; margin-top:16px; margin-bottom:16px;">
                    <div style="display:flex; align-items:center; gap:14px;">
                        <div style="width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg,#0ea5e9,#0284c7); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 12px rgba(14,165,233,0.3);">
                            <i class="fas fa-robot" style="color:#fff; font-size:20px;"></i>
                        </div>
                        <div>
                            <div style="font-size:17px; font-weight:900; color:var(--text-main);">Pyrogram Session</div>
                            <div style="font-size:11px; color:var(--text-sub); font-weight:600;">Generate & save sessions easily</div>
                        </div>
                    </div>
                </div>

                <!-- Session Generator Form -->
                <div class="glass-card" style="border-radius:16px; padding:20px; margin-bottom:16px;" id="pyroGeneratorStep1">
                    <h3 style="font-size:15px; font-weight:800; color:var(--text-main); margin-bottom:16px; display:flex; align-items:center; gap:8px;">
                        <i class="fas fa-wand-magic-sparkles text-blue-400"></i> Generate Session
                    </h3>
                    
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:10px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">Phone Number (with code)</label>
                        <div style="position:relative;">
                            <i class="fas fa-phone" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); font-size:14px;"></i>
                            <input type="text" id="pyroPhoneGen" placeholder="+1234567890" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 12px 12px 40px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
                        <div>
                            <label style="display:block; font-size:10px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">API ID</label>
                            <div style="position:relative;">
                                <i class="fas fa-key" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); font-size:14px;"></i>
                                <input type="text" id="pyroApiIdGen" placeholder="123456" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 12px 12px 38px; color:#fff; font-size:13px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                            </div>
                        </div>
                        <div>
                            <label style="display:block; font-size:10px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">API Hash</label>
                            <div style="position:relative;">
                                <i class="fas fa-hashtag" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); font-size:14px;"></i>
                                <input type="text" id="pyroApiHashGen" placeholder="0123...cdef" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 12px 12px 38px; color:#fff; font-size:13px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                            </div>
                        </div>
                    </div>
                    
                    <button onclick="pyrogramSendCode()" id="pyroSendCodeBtn" class="bcp-btn" style="width:100%; padding:14px; border-radius:12px;">
                        <i class="fas fa-paper-plane" style="margin-right:8px;"></i> Send OTP Code
                    </button>
                </div>

                <!-- Step 2: Verify OTP Form (Hidden initially) -->
                <div class="glass-card" style="border-radius:16px; padding:20px; margin-bottom:16px; display:none;" id="pyroGeneratorStep2">
                    <h3 style="font-size:15px; font-weight:800; color:var(--text-main); margin-bottom:16px; display:flex; align-items:center; gap:8px;">
                        <i class="fas fa-shield-halved text-green-400"></i> Verify OTP Code
                    </h3>
                    
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:10px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">OTP Code</label>
                        <div style="position:relative;">
                            <i class="fas fa-comment-sms" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); font-size:14px;"></i>
                            <input type="text" id="pyroOtpCode" placeholder="12345" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 12px 12px 40px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#10b981'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                    </div>

                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:10px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">2FA Password (If enabled)</label>
                        <div style="position:relative;">
                            <i class="fas fa-lock" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); font-size:14px;"></i>
                            <input type="password" id="pyro2fa" placeholder="Leave empty if none" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 12px 12px 40px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#10b981'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                    </div>
                    
                    <button onclick="pyrogramVerifyCode()" id="pyroVerifyCodeBtn" class="bcp-btn" style="width:100%; padding:14px; border-radius:12px; background:linear-gradient(135deg,#10b981,#059669); box-shadow:0 4px 12px rgba(16,185,129,0.3);">
                        <i class="fas fa-check-circle" style="margin-right:8px;"></i> Generate Session
                    </button>
                    <button onclick="pyrogramCancelGenerate()" style="width:100%; background:rgba(255,255,255,0.05); color:var(--text-sub); border:none; border-radius:12px; padding:14px; font-size:14px; font-weight:700; cursor:pointer; margin-top:8px; transition:0.2s;">
                        Cancel
                    </button>
                </div>

                <!-- Add Manually (Collapsible) -->
                <div class="glass-card" style="border-radius:16px; padding:16px; margin-bottom:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="document.getElementById('pyroManualAdd').style.display = document.getElementById('pyroManualAdd').style.display === 'none' ? 'block' : 'none'">
                        <h3 style="font-size:14px; font-weight:700; color:var(--text-main); margin:0;">
                            <i class="fas fa-plus text-gray-400 mr-2"></i> Or Add Manually
                        </h3>
                        <i class="fas fa-chevron-down text-gray-400"></i>
                    </div>
                    
                    <div id="pyroManualAdd" style="display:none; margin-top:16px; border-top:1px solid rgba(255,255,255,0.05); padding-top:16px;">
                        <div style="margin-bottom:12px;">
                            <label style="display:block; font-size:10px; font-weight:700; color:var(--text-sub); margin-bottom:4px; letter-spacing:0.5px; text-transform:uppercase;">Phone Number</label>
                            <input type="text" id="pyroPhone" placeholder="+1234567890" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px; color:#fff; font-size:13px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                            <div>
                                <label style="display:block; font-size:10px; font-weight:700; color:var(--text-sub); margin-bottom:4px; letter-spacing:0.5px; text-transform:uppercase;">API ID</label>
                                <input type="text" id="pyroApiId" placeholder="123456" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px; color:#fff; font-size:13px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                            </div>
                            <div>
                                <label style="display:block; font-size:10px; font-weight:700; color:var(--text-sub); margin-bottom:4px; letter-spacing:0.5px; text-transform:uppercase;">API Hash</label>
                                <input type="text" id="pyroApiHash" placeholder="0123...cdef" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px; color:#fff; font-size:13px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                            </div>
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="display:block; font-size:10px; font-weight:700; color:var(--text-sub); margin-bottom:4px; letter-spacing:0.5px; text-transform:uppercase;">Session String</label>
                            <textarea id="pyroSession" rows="3" placeholder="Paste your long session string..." style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px; color:#fff; font-size:13px; outline:none; transition:0.3s; resize:none;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'"></textarea>
                        </div>
                        <button onclick="savePyrogramSession()" style="width:100%; background:rgba(255,255,255,0.08); color:white; border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">
                            <i class="fas fa-save" style="margin-right:6px;"></i> Save Manually
                        </button>
                    </div>
                </div>

                <!-- Saved Sessions List -->
                <div class="glass-card" style="border-radius:16px; padding:20px; margin-bottom:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                        <h3 style="font-size:15px; font-weight:800; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
                            <i class="fas fa-list text-gray-400"></i> Saved Sessions
                        </h3>
                        <button onclick="loadPyrogramSessions()" style="background:rgba(14,165,233,0.15); border:none; color:#0ea5e9; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:10px; transition:0.2s;" onmouseover="this.style.background='rgba(14,165,233,0.25)'" onmouseout="this.style.background='rgba(14,165,233,0.15)'">
                            <i class="fas fa-sync-alt text-sm"></i>
                        </button>
                    </div>
                    <div id="pyrogramList" style="display:flex; flex-direction:column; gap:12px;">
                        <!-- Loading... -->
                    </div>
                </div>

            </div>
        </div>
"""

content = re.sub(r'<!-- PYROGRAM PAGE -->[\s\S]*?<div id="botHostingPage"', new_pyrogram_page + '\n\n        <div id="botHostingPage"', content)

with open('web/index.html', 'w') as f:
    f.write(content)
