require('dotenv').config({ path: '.env.local' });
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: 'test_admin_user', isAdmin: true },
  process.env.JWT_SECRET || 'fallback_secret',
  { expiresIn: '1h' }
);

fetch('http://localhost:3000/api/admin/canva/meta-ai', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "Generate an image of a serene yoga studio with sunlight streaming through large windows",
    // We omit templateId so it just generates the image and doesn't try to send to Canva Autofill yet
  })
})
.then(res => res.json())
.then(json => {
  console.log("Response:", JSON.stringify(json, null, 2));
  process.exit(0);
})
.catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
