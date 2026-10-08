const { bunnyExecute } = require('./lib/bunny-db.js');
(async () => {
  try {
    const forms = await bunnyExecute({ sql: "SELECT * FROM mongo_documents WHERE collection_name = 'enquiry_forms'", args: [] });
    console.log(JSON.stringify(forms, null, 2));
  } catch (err) {
    console.error(err);
  }
})();
