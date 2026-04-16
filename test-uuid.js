require('dotenv').config({path:'.env.local'});
const axios = require('axios');

(async () => {
  try {
    const tokenRes = await axios.post('https://zoom.us/oauth/token', null, {
      params: {
        grant_type: 'account_credentials',
        account_id: process.env.ZOOM_BOT_ACCOUNT_ID
      },
      auth: {
        username: process.env.ZOOM_CLIENT_ID,
        password: process.env.ZOOM_CLIENT_SECRET
      },
      validateStatus: () => true
    });
    
    const token = tokenRes.data.access_token;
    
    // Get meeting details including UUID
    console.log('📞 Getting meeting UUID...\n');
    const meetRes = await axios.get('https://api.zoom.us/v2/meetings/84851713697', {
      headers: {Authorization: `Bearer ${token}`},
      validateStatus: () => true
    });
    
    if (meetRes.status !== 200) {
      console.log('❌ Meeting error:', meetRes.status);
      process.exit(1);
    }
    
    const uuid = meetRes.data.uuid;
    console.log('Meeting UUID:', uuid);
    console.log('Meeting ID:', meetRes.data.id);
    console.log('Status:', meetRes.data.status, '\n');
    
    // Try with UUID instead of numeric ID
    console.log('🧪 Testing chat with UUID...\n');
    const url = `https://api.zoom.us/v2/meetings/${uuid}/chat/messages`;
    console.log('URL:', url, '\n');
    
    const msgRes = await axios.post(
      url,
      {message: '✅ **TESTING WITH UUID** - chat message test'},
      {
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        validateStatus: () => true
      }
    );
    
    console.log('Status:', msgRes.status);
    if (msgRes.status === 201) {
      console.log('✅ SUCCESS WITH UUID!');
    } else {
      console.log('Error:', msgRes.data);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
