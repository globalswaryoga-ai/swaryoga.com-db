require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Initialize WhatsApp client (starts QR flow / session restore)
require('./whatsappClient');

const app = express();
const port = Number(process.env.PORT || 4010);

app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use('/api/whatsapp', require('./routes/whatsapp'));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'whatsapp-web-bridge' });
});

app.listen(port, () => {
  console.log(`WhatsApp Web bridge listening on http://localhost:${port}`);
  console.log('POST /api/whatsapp/send { phone, message }');
});
