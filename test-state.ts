import { POST } from './app/api/sadhana/live/[slug]/state/route';
import { NextRequest } from 'next/server';

const req = new NextRequest('http://localhost:3000/api/sadhana/live/hindi-swar-yoga-l-1-sadhana/state', {
  method: 'POST',
  body: JSON.stringify({ sessionId: 'test' })
});

POST(req, { params: { slug: 'hindi-swar-yoga-l-1-sadhana' } })
  .then(res => res.text())
  .then(text => console.log(text))
  .catch(err => console.error(err));
