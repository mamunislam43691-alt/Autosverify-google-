with open('web/admin.html', 'r') as f:
    content = f.read()

nav_item = '                <div class="nav-item" onclick="nav(\'costmanage\')"><i class="fas fa-coins w-5 text-orange-400"></i> Cost Manage</div>\n                <div class="nav-item" onclick="nav(\'pyrogram\')"><i class="fas fa-robot w-5 text-blue-400"></i> Pyrogram User Bot</div>'

content = content.replace('                <div class="nav-item" onclick="nav(\'costmanage\')"><i class="fas fa-coins w-5 text-orange-400"></i> Cost Manage</div>', nav_item)

with open('web/admin.html', 'w') as f:
    f.write(content)
