// api/page-state.js
// Vercel Serverless Function - Page State Management
// Handles saving and retrieving page state for users

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight CORS requests
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  const method = req.method || 'GET';

  if (method === 'POST') {
    // Save page state - currently a stub, later connects to MongoDB
    console.log('📝 Page state save request:', req.body);

    sendJson(res, 200, {
      ok: true,
      message: 'Page state saved successfully.',
      timestamp: new Date().toISOString(),
    });
  } else if (method === 'GET') {
    // Retrieve page state - currently returns null, later loads from MongoDB
    sendJson(res, 200, {
      ok: true,
      state: null,
      message: 'Page state retrieval is not implemented yet.',
      timestamp: new Date().toISOString(),
    });
  } else {
    // Method not allowed
    sendJson(res, 405, {
      ok: false,
      message: `Method ${method} not allowed on /api/page-state`,
    });
  }
};
