require('dotenv').config({ path: '.env.local' });
const { bunnyExecute } = require('./lib/bunnyDatabase');
(async () => {
  try {
    const result = await bunnyExecute({
      sql: "DELETE FROM leads_sql WHERE data_json LIKE '%meta_instant_form%' AND data_json LIKE '%\"workshopId\":null%'",
      args: []
    });
    console.log('Deleted rows');
  } catch (err) {
    console.error(err);
  }
})();
