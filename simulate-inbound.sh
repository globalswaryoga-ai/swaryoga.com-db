
#!/bin/bash
curl -X POST "http://localhost:3000/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -H "User-Agent: FacebookPlatform/1.0" \
  -d '{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "88888888",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15550258838",
              "phone_number_id": "111111111111111"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Mohan Test"
                },
                "wa_id": "919075358557"
              }
            ],
            "messages": [
              {
                "from": "919075358557",
                "id": "wamid.HBgMOTE5Nzc5MDA2ODIwFQIAEhggOTY3NTI2RDcyRjYwOUQ0RTFCMzY4M0I4RjEwQkEwRTQA",
                "timestamp": "1704870000",
                "text": {
                  "body": "This is a simulated message from 9075358557 to fix the issue."
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
}'
