const fs = require('fs');
let code = fs.readFileSync('./web/admin.html', 'utf8');

const regex = /<!-- Live Stream & Post Assistant -->[\s\S]*?<!-- Bot Stats Card -->/m;
const match = code.match(regex);

if (match) {
    let block = match[0].replace('<!-- Bot Stats Card -->', '').trim();
    code = code.replace(match[0], '<!-- Bot Stats Card -->');
    code = code.replace('<!-- Info Box -->', block + '\n                        <!-- Info Box -->');
    fs.writeFileSync('./web/admin.html', code);
    console.log("Moved successfully.");
} else {
    console.log("Could not find the block to move.");
}
