import re

with open('app/admin/crm/mohan-rag/avatar-studio/page.tsx', 'r') as f:
    text = f.read()

replacements = [
    (
        'const confirmMsg = `क्या आप इस वोकल डीएनए प्रोफाइल "${name || id}" को हटाना चाहते हैं?\\n\\nयह डेटाबेस से हमेशा के लिए हटा दी जाएगी।`;',
        'const confirmMsg = `Are you sure you want to remove vocal DNA profile "${name || id}"?\\n\\nThis will be permanently removed from the database.`;'
    ),
    (
        'const confirmMsg = `क्या आप stored-media library entry "${title || id}" को हटाना चाहते हैं?`;',
        'const confirmMsg = `Are you sure you want to remove stored-media library entry "${title || id}"?`;'
    ),
    (
        'showToast(`👔 प्रोफेशन चुना गया: ${p.nameHi} (${p.nameEn})`);',
        'showToast(`👔 Profession selected: ${p.nameEn} (${p.nameHi})`);'
    ),
    (
        'showToast(`🎬 एंकर चुना गया: ${vid.title}`);',
        'showToast(`🎬 Master anchor selected: ${vid.title}`);'
    ),
    (
        'setPreviewModalTitle(`${prof.nameHi} — 1-मिनट प्रस्तोता वीडियो (1080p Full HD)`);',
        'setPreviewModalTitle(`${prof.nameEn} (${prof.nameHi}) — 1-Minute Presenter Video (1080p Full HD)`);'
    ),
    (
        'showToast(`👔 परिधान चुना गया: ${wardrobe.nameHi}`);',
        'showToast(`👔 Wardrobe selected: ${wardrobe.nameEn} (${wardrobe.nameHi})`);'
    ),
    (
        'showToast(`🏛️ वातावरण चुना गया: ${env.nameHi}`);',
        'showToast(`🏛️ Environment selected: ${env.nameEn} (${env.nameHi})`);'
    ),
    (
        'showToast(`📐 कैमरा चुना गया: ${cam.nameHi}`);',
        'showToast(`📐 Camera framing selected: ${cam.nameEn} (${cam.nameHi})`);'
    ),
    (
        "if (p.label.includes('मराठी')) setVoiceEngineLang('mr');",
        "if (p.label.includes('Marathi')) setVoiceEngineLang('mr');"
    ),
    (
        "{ id: 'all', label: `सभी (${voiceProfiles.length})` },",
        "{ id: 'all', label: `All (${voiceProfiles.length})` },"
    ),
    (
        "{ id: 'hi', label: `हिन्दी (${voiceProfiles.filter((v) => v.language === 'hi').length})` },",
        "{ id: 'hi', label: `Hindi (${voiceProfiles.filter((v) => v.language === 'hi').length})` },"
    ),
    (
        "{ id: 'mr', label: `मराठी (${voiceProfiles.filter((v) => v.language === 'mr').length})` },",
        "{ id: 'mr', label: `Marathi (${voiceProfiles.filter((v) => v.language === 'mr').length})` },"
    ),
    (
        'showToast(`🎙️ डीएनए वोकल चुना गया: ${voice.name}`);',
        'showToast(`🎙️ Vocal DNA selected: ${voice.name}`);'
    ),
]

for old, new in replacements:
    if old in text:
        text = text.replace(old, new)
        print(f"Replaced: {old[:40]}...")
    else:
        print(f"NOT FOUND: {old[:40]}...")

with open('app/admin/crm/mohan-rag/avatar-studio/page.tsx', 'w') as f:
    f.write(text)

print("Done updating page.tsx")

