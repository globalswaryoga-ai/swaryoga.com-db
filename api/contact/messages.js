// api/contact/messages.js
// Vercel Serverless Function - Contact Form Handler
// Receives contact form submissions and logs them
// Later can be connected to MongoDB or Email Service

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-ID');

  // Handle preflight CORS requests
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  const method = req.method || 'POST';

  if (method === 'POST') {
    // Collect incoming data from request body
    let rawBody = '';

    req.on('data', (chunk) => {
      rawBody += chunk.toString();
    });

    req.on('end', () => {
      let data = {};

      try {
        // Parse JSON from frontend
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch (err) {
        console.error('❌ Could not parse contact form JSON:', err.message);
        // Don't fail - still return success so frontend doesn't crash
      }

      // Log the contact message (console visible in Vercel logs)
      console.log('📩 New contact message received:', {
        name: data.name || 'Unknown',
        email: data.email || 'Unknown',
        message: data.message || 'No message',
        timestamp: new Date().toISOString(),
      });

      // Return success response
      sendJson(res, 200, {
        ok: true,
        message: 'Contact message received successfully.',
        messageId: `msg_${Date.now()}`,
        timestamp: new Date().toISOString(),
      });
    });
  } else if (method === 'GET') {
    // Optionally retrieve all contact messages (future feature)
    sendJson(res, 200, {
      ok: true,
      messages: [],
      message: 'Contact message retrieval is not implemented yet.',
    });
  } else {
    // Method not allowed
    sendJson(res, 405, {
      ok: false,
      message: `Method ${method} not allowed on /api/contact/messages`,
    });
  }
};
