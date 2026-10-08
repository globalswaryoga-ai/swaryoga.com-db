with open("app/admin/crm/e-learning/rag-video/page.tsx", "r") as f:
    content = f.read()

target = 'accept="audio/*"'
replacement = 'accept="audio/*,video/mp4,video/quicktime,video/webm"'

content = content.replace(target, replacement)

with open("app/admin/crm/e-learning/rag-video/page.tsx", "w") as f:
    f.write(content)

print("done")
