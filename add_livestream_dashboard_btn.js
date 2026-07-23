const fs = require('fs');
let code = fs.readFileSync('./web/admin.html', 'utf8');

const searchBtn = `<button onclick="nav('groups')" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2">
                                <i class="fas fa-users"></i> Manage Groups
                            </button>`;

const newBtns = `<button onclick="nav('groups')" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2">
                                <i class="fas fa-users"></i> Manage Groups
                            </button>
                            <button onclick="nav('livestream')" class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center gap-2">
                                <i class="fas fa-video"></i> Video Chat Manager
                            </button>`;

if (code.includes(searchBtn)) {
    code = code.replace(searchBtn, newBtns);
    fs.writeFileSync('./web/admin.html', code);
    console.log("Added dashboard button");
} else {
    console.log("Could not find button to replace");
}
