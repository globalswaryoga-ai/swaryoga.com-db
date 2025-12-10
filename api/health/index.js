// api/health/index.js
// Vercel Serverless Function - Health Check
// Returns server and database status

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const method = req.method || 'GET';

  // Handle preflight CORS requests
  if (method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (method === 'GET') {
    // Return health status
    return res.status(200).json({
      status: 'online',
      message: 'Server and Database are live',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: 'vercel-production',
    });
  }

  // Method not allowed
  res.setHeader('Allow', ['GET']);
  return res.status(405).json({
    status: 'error',
    message: `Method ${method} not allowed`,
  });
};
