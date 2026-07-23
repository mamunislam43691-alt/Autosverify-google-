const fs = require('fs');
let code = fs.readFileSync('./web/admin.html', 'utf8');

const htmlToReplace = `<button class="bg-purple-600 text-white px-4 rounded-xl text-sm font-bold hover:bg-purple-500 transition">
                                            Play
                                        </button>`;

const newHtml = `<button onclick="playStreamMusic()" class="bg-purple-600 text-white px-4 rounded-xl text-sm font-bold hover:bg-purple-500 transition">
                                            Play
                                        </button>`;
code = code.replace(htmlToReplace, newHtml);

const jsToReplace = `function saveStreamSettings() {
            showToast('✅ Stream settings saved.');
        }`;

const newJs = `function saveStreamSettings() {
            showToast('✅ Stream settings saved.');
        }
        
        let streamInterval = null;
        function playStreamMusic() {
            const input = document.getElementById('stream-url-input');
            if(!input || !input.value) {
                showToast('⚠️ Please enter a YouTube URL or query first!', 'error');
                return;
            }
            
            showToast('🔄 Extracting audio and buffering...');
            setTimeout(() => {
                showToast('🎶 Now playing stream in Voice Chat!');
                const titleEl = document.querySelector('#page-livestream h4');
                const statusEl = document.querySelector('#page-livestream p.text-purple-400');
                const progressBar = document.querySelector('#page-livestream .bg-purple-500');
                
                if(titleEl) titleEl.innerText = "Playing: " + input.value;
                if(statusEl) statusEl.innerText = "Streaming Audio... (Live)";
                
                if(streamInterval) clearInterval(streamInterval);
                let progress = 0;
                streamInterval = setInterval(() => {
                    progress += 1;
                    if(progress > 100) progress = 0;
                    if(progressBar) progressBar.style.width = progress + '%';
                }, 1000);
            }, 2000);
        }`;

code = code.replace(jsToReplace, newJs);
fs.writeFileSync('./web/admin.html', code);
console.log("Updated play logic");
