const { sendWhatsAppText, normalizePhone } = require("./lib/whatsapp");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

async function test() {
  console.log("ENV Cloud Enable:", process.env.WHATSAPP_ENABLE_CLOUD_SEND);
  console.log("ENV Access Token Length:", process.env.WHATSAPP_ACCESS_TOKEN?.length);
  
  try {
    // We won't actually send because we don't want to spam, 
    // but we can see if it attempts Cloud or Bridge by looking at the logs it would produce or the return type.
    // Wait, getWhatsAppEnv() is internal. I'll just check if it throws or returns.
    console.log("Calling sendWhatsAppText (will probably fail due to mock/invalid check but we want to see provider)");
    // I'll call it with a fake number to see the error message which tells us which provider it used.
    const res = await sendWhatsAppText("1234567890", "test");
    console.log("Result:", res);
  } catch (e) {
    console.log("Caught Error:", e.message);
  }
}

test();
