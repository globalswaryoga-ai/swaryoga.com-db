require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai').default;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  try {
    const models = await openai.models.list();
    const modelNames = models.data.map(m => m.id);
    console.log("All Available models:", modelNames.join(', '));
  } catch (err) {
    console.error("OpenAI Error:", err.message);
  }
}
test();
