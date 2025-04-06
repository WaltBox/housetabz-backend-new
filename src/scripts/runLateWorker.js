// scripts/runLateWorker.js
require('dotenv').config();          // load .env
const { processLateCharges } = require('../../src/workers/latePaymentWorker');

processLateCharges()
  .then(result => {
    console.log('Late payment worker finished:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Late payment worker error:', error);
    process.exit(1);
  });
