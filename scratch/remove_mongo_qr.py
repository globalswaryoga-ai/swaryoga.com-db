import sys

filepath = '/Users/mohankalburgi/swaryoga.com-db/app/api/admin/crm/whatsapp/qr-bridge/route.ts'

with open(filepath, 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    # Skip functions completely
    if 'async function getMongoSessionChats(' in line or 'function mergeBridgeAndMongoChats(' in line or 'async function syncMongoSessionChats(' in line:
        skip = True
        continue
    
    if skip:
        if line.startswith('}') and (
            'return Array.from(byId.values());' in lines[i-1] or 
            'console.error(\'[QR Bridge Proxy] Failed to sync Mongo session chats:\', err);' in lines[i-1] or
            'console.error(\'[QR Bridge Proxy] Failed to load Mongo session chats:\', err);' in lines[i-1]
        ):
            skip = False
        # Also need a generic way to find end of function. 
        # Actually, let's just use string replacement for the exact lines that call these functions.

    if skip:
        continue
        
    # Replace usages of the mongo sync functions
    if 'const rawBridgeData = data; // preserve unfiltered bridge data for MongoDB sync' in line:
        continue
    
    if 'await syncMongoSessionChats(' in line:
        continue
        
    if 'const mongoChats = await getMongoSessionChats(' in line:
        continue
        
    if 'const mergedChats = mergeBridgeAndMongoChats(' in line:
        continue
        
    if 'if (mergedChats.length > 0) {' in line:
        # We removed mergedChats, so we just check if filteredBridgeChats has anything
        new_lines.append(line.replace('mergedChats', 'filteredBridgeChats'))
        continue
        
    if ': \'qr_mongodb_fallback\';' in line:
        new_lines.append(line.replace('qr_mongodb_fallback', 'bridge_empty'))
        continue
        
    if 'chats: mergedChats' in line:
        new_lines.append(line.replace('mergedChats', 'filteredBridgeChats'))
        continue
        
    if 'const QrChat = getQrWhatsAppChat();' in line:
        new_lines.append(line)
        continue

    # Removing the MongoDB fallback for /messages (lines 2054 to 2121 roughly)
    if '// ── MONGODB FALLBACK FOR /messages ──' in line:
        new_lines.append('    // MongoDB fallback removed as requested\n')
        skip = True
        continue
        
    if skip and 'if (path.startsWith(\'/messages/\') && data?.messages?.length === 0) {' in lines[i-3] and '}' in line:
        # Wait, skipping a whole block by matching start and end is risky in python line-by-line without brace counting.
        pass

# Let's use a simpler sed/awk or python brace counter
