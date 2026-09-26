const http = require('http');

http.get('http://localhost:3000/admin/crm/new-registration', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (data.includes('Workshop Registration Form Setup')) {
      console.log('SUCCESS: Text found in HTML response!');
    } else {
      console.log('FAIL: Text not found in HTML response.');
    }
  });
}).on('error', (err) => console.log('Error:', err.message));
