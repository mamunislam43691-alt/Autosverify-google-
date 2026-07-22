with open('web/admin.html', 'r') as f:
    content = f.read()

content = content.replace("'costmanage': 'Cost Management',", "'costmanage': 'Cost Management',\n            'pyrogram': 'Pyrogram User Bot',")

content = content.replace("case 'costmanage':", "case 'pyrogram':\n                        loadAdminPyrograms();\n                        break;\n                    case 'costmanage':")

with open('web/admin.html', 'w') as f:
    f.write(content)
