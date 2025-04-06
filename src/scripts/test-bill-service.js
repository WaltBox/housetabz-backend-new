// test-bill-service.js
const billService = require('../../src/services/billService');

async function testBillService() {
  console.log('Testing fixed recurring bills...');
  const fixedResult = await billService.generateFixedRecurringBills();
  console.log(JSON.stringify(fixedResult, null, 2));
  
  console.log('\nTesting variable service reminders...');
  const variableResult = await billService.generateVariableServiceReminders();
  console.log(JSON.stringify(variableResult, null, 2));
  
  console.log('\nTesting bill submission requests...');
  const submissionResult = await billService.generateVariableBillSubmissionRequests();
  console.log(JSON.stringify(submissionResult, null, 2));
  
  console.log('\nTesting submission reminders...');
  const reminderResult = await billService.generateBillSubmissionReminders();
  console.log(JSON.stringify(reminderResult, null, 2));
}

testBillService().catch(console.error);