with open('web/script.js', 'r') as f:
    content = f.read()

js_code = """
let pyroGenState = {
    phone: '',
    apiId: '',
    apiHash: '',
    phoneCodeHash: ''
};

async function pyrogramSendCode() {
    const phone = document.getElementById('pyroPhoneGen').value.trim();
    const apiId = document.getElementById('pyroApiIdGen').value.trim();
    const apiHash = document.getElementById('pyroApiHashGen').value.trim();
    const btn = document.getElementById('pyroSendCodeBtn');

    if (!phone || !apiId || !apiHash) {
        return showToast('Please fill phone, API ID and API Hash', 'error');
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/pyrogram/generate/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, apiId, apiHash })
        });
        const data = await res.json();
        
        btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i> Send OTP Code';
        btn.disabled = false;

        if (data.success) {
            showToast('OTP code sent successfully', 'success');
            pyroGenState = { phone, apiId, apiHash, phoneCodeHash: data.phoneCodeHash };
            
            document.getElementById('pyroGeneratorStep1').style.display = 'none';
            document.getElementById('pyroGeneratorStep2').style.display = 'block';
            document.getElementById('pyroOtpCode').value = '';
            document.getElementById('pyro2fa').value = '';
        } else {
            showToast(data.message || 'Failed to send code', 'error');
        }
    } catch (e) {
        btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i> Send OTP Code';
        btn.disabled = false;
        showToast('Network error while sending code', 'error');
    }
}

function pyrogramCancelGenerate() {
    document.getElementById('pyroGeneratorStep2').style.display = 'none';
    document.getElementById('pyroGeneratorStep1').style.display = 'block';
    pyroGenState = {};
}

async function pyrogramVerifyCode() {
    if (!userData || !userData.id) return showToast('Please login first', 'error');
    
    const code = document.getElementById('pyroOtpCode').value.trim();
    const password = document.getElementById('pyro2fa').value.trim();
    const btn = document.getElementById('pyroVerifyCodeBtn');

    if (!code) {
        return showToast('Please enter the OTP code', 'error');
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/pyrogram/generate/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userData.id,
                phone: pyroGenState.phone,
                apiId: pyroGenState.apiId,
                apiHash: pyroGenState.apiHash,
                phoneCodeHash: pyroGenState.phoneCodeHash,
                code,
                password
            })
        });
        const data = await res.json();
        
        btn.innerHTML = '<i class="fas fa-check-circle" style="margin-right:8px;"></i> Generate Session';
        btn.disabled = false;

        if (data.success) {
            showToast('Session generated and saved!', 'success');
            pyrogramCancelGenerate();
            
            // clear form
            document.getElementById('pyroPhoneGen').value = '';
            document.getElementById('pyroApiIdGen').value = '';
            document.getElementById('pyroApiHashGen').value = '';
            
            loadPyrogramSessions();
        } else {
            showToast(data.message || 'Failed to generate session', 'error');
        }
    } catch (e) {
        btn.innerHTML = '<i class="fas fa-check-circle" style="margin-right:8px;"></i> Generate Session';
        btn.disabled = false;
        showToast('Network error while verifying', 'error');
    }
}
"""

content = content + "\n" + js_code

with open('web/script.js', 'w') as f:
    f.write(content)
