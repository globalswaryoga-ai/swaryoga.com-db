require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai').default;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  try {
    const response = await openai.images.generate({
      model: 'dall-e-2',
      prompt: "A beautiful serene yoga studio",
      n: 1,
      size: '512x512',
    });
    console.log("Success! Image URL:", response.data[0].url);
  } catch (err) {
    console.error("OpenAI Error:", err.message);
  }
}
test();
