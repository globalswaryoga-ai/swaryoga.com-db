// api/goals/index.js
// Vercel Serverless Function - Goals Management
// Handles CRUD operations for user goals

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-ID');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  const method = req.method || 'GET';
  const userId = req.headers['x-user-id'];

  if (method === 'GET') {
    return res.status(200).json({
      success: true,
      data: [],
      count: 0,
      message: 'Goals list retrieved (stub - MongoDB connection coming soon)',
    });
  } else if (method === 'POST') {
    return res.status(201).json({
      success: true,
      data: { _id: `goal_${Date.now()}`, ...req.body },
      message: 'Goal created successfully (stub backend)',
    });
  } else if (method === 'PUT') {
    return res.status(200).json({
      success: true,
      data: req.body,
      message: 'Goal updated successfully (stub backend)',
    });
  } else if (method === 'DELETE') {
    return res.status(200).json({
      success: true,
      message: 'Goal deleted successfully (stub backend)',
    });
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({
      success: false,
      message: `Method ${method} not allowed`,
    });
  }
};
