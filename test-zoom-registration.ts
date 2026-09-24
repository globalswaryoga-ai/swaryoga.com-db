require('dotenv').config({ path: '.env.local' });
const { listZoomMeetings } = require('./lib/zoom-meetings');

async function main() {
  try {
    // Note: since it's typescript, we might need ts-node or just compile it on the fly
    // Let's use ts-node
    console.log("We need to run this with ts-node");
  } catch (e) {
    console.error(e);
  }
}
main();
