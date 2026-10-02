require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai').default;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  try {
    const response = await openai.images.generate({
      model: 'chatgpt-image-latest',
      prompt: "A beautiful serene yoga studio",
      n: 1,
      size: '1024x1024',
    });
    console.log("Success! Full Response:", JSON.stringify(response, null, 2));
  } catch (err) {
    console.error("OpenAI Error chatgpt-image-latest:", err.message);
  }
}
test();
