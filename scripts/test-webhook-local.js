
const fetch = require('node-fetch');

// This script simulates a Meta WhatsApp Inbound Message webhook hit
// Usage: node scripts/test-webhook-local.js [phone] [message]

async function testWebhook() {
    const phone = process.argv[2] || '919309986820';
    const message = process.argv[3] || 'Test inbound message ' + new Date().toISOString();
    
    const payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "885699153942203",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "16505551111",
                                "phone_number_id": "123456789012345"
                            },
                            "contacts": [
                                {
                                    "profile": {
                                        "name": "Tester"
                                    },
                                    "wa_id": phone
                                }
                            ],
                            "messages": [
                                {
                                    "from": phone,
                                    "id": "wamid." + Math.random().toString(36).substring(7),
                                    "timestamp": Math.floor(Date.now() / 1000).toString(),
                                    "text": {
                                        "body": message
                                    },
                                    "type": "text"
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    };

    console.log('Sending mock Meta payload to local webhook...');
    const url = 'http://localhost:3000/api/whatsapp/webhook';
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hub-signature-256': 'sha256=DEBUG' // code is set to skip sig check in debug if configured
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log('Response Status:', res.status);
        console.log('Response Body:', data);
    } catch (err) {
        console.error('Fetch failed:', err.message);
        console.log('Make sure your local server is running on port 3000!');
    }
}

testWebhook();
