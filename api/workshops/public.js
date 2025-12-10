// api/workshops/public.js
// Vercel Serverless Function - Public Workshops Listing
// Returns publicly available workshops (stub data)

module.exports = async (req, res) => {
  const method = req.method || 'GET';

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight CORS requests
  if (method === 'OPTIONS') {
    res.status(200);
    return res.json({ ok: true });
  }

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405);
    return res.json({
      ok: false,
      message: `Method ${method} not allowed on /api/workshops/public`,
    });
  }

  // Return public workshop data (stub - later from MongoDB)
  const workshops = [
    {
      id: 'demo-1',
      title: 'Swar Yoga Youth Program',
      description: '10 days online Swar Yoga program to balance mind, body and breath.',
      mode: 'online',
      language: 'Hindi',
      startDate: '2025-12-19',
      endDate: '2025-12-28',
      time: '9:00 PM',
      price: 0,
      status: 'upcoming',
    },
    {
      id: 'demo-2',
      title: 'Swar Yoga Basics',
      description: 'Learn the fundamentals of Swar Yoga practice.',
      mode: 'online',
      language: 'English',
      startDate: '2025-12-25',
      endDate: '2025-12-31',
      time: '10:00 AM',
      price: 999,
      status: 'upcoming',
    },
  ];

  res.status(200);
  return res.json({
    ok: true,
    data: workshops,
    count: workshops.length,
    message: 'Public workshops retrieved successfully (stub data).',
  });
};
