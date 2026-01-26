const axios = require('axios');

const urls = [
  'https://swarygoal1hindi.s3.us-east-1.amazonaws.com/community-posts/test-image.jpg',
  'https://swarygoal1hindi.s3.amazonaws.com/community-posts/test-image.jpg'
];

async function check() {
  for (const url of urls) {
    try {
      const res = await axios.head(url);
      console.log(`URL: ${url} - Status: ${res.status}`);
    } catch (err) {
      console.log(`URL: ${url} - Error: ${err.message}`);
    }
  }
}

check();
