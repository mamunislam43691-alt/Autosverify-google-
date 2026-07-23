const { Api, TelegramClient } = require('telegram');
console.log(Object.keys(Api).filter(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('call') || k.toLowerCase().includes('voice')));
