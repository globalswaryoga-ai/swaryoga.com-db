// api/page-state.js
// Vercel Serverless Function - Page State Management
// Handles saving and retrieving page state for users (stub)

module.exports = async (req, res) => {
  const method = req.method || 'GET';

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight CORS requests
  if (method === 'OPTIONS') {
    res.status(200);
    return res.json({ ok: true });
  }

  if (method === 'POST') {
    // Save page state - currently a stub, later connects to MongoDB
    // We ignore the request body for now
    console.log('📝 Page state save request received at', new Date().toISOString());

    res.status(200);
    return res.json({
      ok: true,
      message: 'Page state saved successfully (stub backend).',
      timestamp: new Date().toISOString(),
    });
  }

  if (method === 'GET') {
    // Retrieve page state - currently returns null, later loads from MongoDB
    res.status(200);
    return res.json({
      ok: true,
      state: null,
      message: 'Page state retrieval is not implemented yet (stub).',
      timestamp: new Date().toISOString(),
    });
  }

  // Method not allowed
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405);
  return res.json({
    ok: false,
    message: `Method ${method} not allowed on /api/page-state`,
  });
};
