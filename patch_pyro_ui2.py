import re

with open('web/index.html', 'r') as f:
    content = f.read()

new_form = """
                <!-- Session Generator Form -->
                <div style="background:var(--bg-card); border-radius:16px; padding:20px; margin-bottom:16px;" id="pyroGeneratorStep1">
                    <h3 style="font-size:16px; font-weight:800; color:var(--text-main); margin-bottom:20px;">Generate Pyrogram Session</h3>
                    
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">Phone Number (with code)</label>
                        <div style="position:relative;">
                            <i class="fas fa-phone" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); font-size:14px;"></i>
                            <input type="text" id="pyroPhoneGen" placeholder="+1234567890" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 12px 12px 40px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">API ID</label>
                        <div style="position:relative;">
                            <i class="fas fa-key" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); font-size:14px;"></i>
                            <input type="text" id="pyroApiIdGen" placeholder="e.g. 123456" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 12px 12px 40px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                    </div>

                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">API Hash</label>
                        <div style="position:relative;">
                            <i class="fas fa-hashtag" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); font-size:14px;"></i>
                            <input type="text" id="pyroApiHashGen" placeholder="e.g. 0123456789abcdef0123456789abcdef" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 12px 12px 40px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                    </div>
                    
                    <button onclick="pyrogramSendCode()" id="pyroSendCodeBtn" style="width:100%; background:linear-gradient(135deg,#0ea5e9,#0284c7); color:white; border:none; border-radius:12px; padding:14px; font-size:15px; font-weight:800; cursor:pointer; margin-top:4px; box-shadow:0 4px 12px rgba(14,165,233,0.3); transition:0.2s;" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">
                        <i class="fas fa-paper-plane" style="margin-right:8px;"></i> Send OTP Code
                    </button>
                </div>

                <!-- Step 2: Verify OTP Form (Hidden initially) -->
                <div style="background:var(--bg-card); border-radius:16px; padding:20px; margin-bottom:16px; display:none;" id="pyroGeneratorStep2">
                    <h3 style="font-size:16px; font-weight:800; color:var(--text-main); margin-bottom:20px;">Verify OTP Code</h3>
                    
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">OTP Code</label>
                        <div style="position:relative;">
                            <i class="fas fa-comment-sms" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); font-size:14px;"></i>
                            <input type="text" id="pyroOtpCode" placeholder="12345" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 12px 12px 40px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                    </div>

                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">2FA Password (If enabled)</label>
                        <div style="position:relative;">
                            <i class="fas fa-lock" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); font-size:14px;"></i>
                            <input type="password" id="pyro2fa" placeholder="Leave empty if none" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 12px 12px 40px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                    </div>
                    
                    <button onclick="pyrogramVerifyCode()" id="pyroVerifyCodeBtn" style="width:100%; background:linear-gradient(135deg,#10b981,#059669); color:white; border:none; border-radius:12px; padding:14px; font-size:15px; font-weight:800; cursor:pointer; margin-top:4px; box-shadow:0 4px 12px rgba(16,185,129,0.3); transition:0.2s;" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">
                        <i class="fas fa-check-circle" style="margin-right:8px;"></i> Generate Session
                    </button>
                    <button onclick="pyrogramCancelGenerate()" style="width:100%; background:rgba(255,255,255,0.05); color:var(--text-sub); border:none; border-radius:12px; padding:14px; font-size:14px; font-weight:700; cursor:pointer; margin-top:8px; transition:0.2s;">
                        Cancel
                    </button>
                </div>

                <!-- Add Manually (Collapsible) -->
                <div style="background:var(--bg-card); border-radius:16px; padding:20px; margin-bottom:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="document.getElementById('pyroManualAdd').style.display = document.getElementById('pyroManualAdd').style.display === 'none' ? 'block' : 'none'">
                        <h3 style="font-size:15px; font-weight:700; color:var(--text-main); margin:0;">Or Add Session Manually</h3>
                        <i class="fas fa-chevron-down text-gray-400"></i>
                    </div>
                    
                    <div id="pyroManualAdd" style="display:none; margin-top:16px; border-top:1px solid rgba(255,255,255,0.1); padding-top:16px;">
                        <div style="margin-bottom:16px;">
                            <label style="display:block; font-size:11px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">Phone Number</label>
                            <input type="text" id="pyroPhone" placeholder="+1234567890" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="display:block; font-size:11px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">API ID</label>
                            <input type="text" id="pyroApiId" placeholder="e.g. 123456" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="display:block; font-size:11px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">API Hash</label>
                            <input type="text" id="pyroApiHash" placeholder="e.g. 0123456789abcdef0123456789abcdef" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; color:#fff; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                        </div>
                        <div style="margin-bottom:20px;">
                            <label style="display:block; font-size:11px; font-weight:700; color:var(--text-sub); margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase;">Session String</label>
                            <textarea id="pyroSession" rows="3" placeholder="Enter your long session string here..." style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; color:#fff; font-size:14px; outline:none; transition:0.3s; resize:none;" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'"></textarea>
                        </div>
                        <button onclick="savePyrogramSession()" style="width:100%; background:rgba(255,255,255,0.1); color:white; border:none; border-radius:12px; padding:14px; font-size:14px; font-weight:700; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                            <i class="fas fa-save" style="margin-right:8px;"></i> Save Manually
                        </button>
                    </div>
                </div>"""

# Replace the old form with the new one
content = re.sub(r'<!-- Input Form -->[\s\S]*?<!-- Saved Sessions List -->', new_form + '\n\n                <!-- Saved Sessions List -->', content)

with open('web/index.html', 'w') as f:
    f.write(content)
