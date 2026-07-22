with open('web/admin.html', 'r') as f:
    content = f.read()

with open('web/admin-pyrogram.html', 'r') as f:
    pyrogram = f.read()

content = content.replace('<!-- 4. TASKS -->', pyrogram + '\n<!-- 4. TASKS -->')

with open('web/admin.html', 'w') as f:
    f.write(content)
