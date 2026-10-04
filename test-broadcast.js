const args = {
  name: 'Test Broadcast',
  templateId: '67000e335293fb5b4516ff42', // A valid template id
  provider: 'meta',
  target: {
    type: 'filters',
    leadIds: [],
    csvContacts: [{ name: 'Test', phoneNumber: '919999999999' }]
  },
  mode: 'now'
};
console.log(JSON.stringify(args));
