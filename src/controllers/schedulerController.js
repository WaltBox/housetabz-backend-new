// src/controllers/schedulerController.js
const billService = require('../services/billService');
const hsiService = require('../services/hsiService');

exports.runDailyTasks = async (req, res) => {
  try {
    // Call your scheduled services here
    await billService.generateFixedRecurringBills();
    await billService.generateVariableServiceReminders();
    await billService.generateVariableBillSubmissionRequests();
    await billService.generateBillSubmissionReminders();
    await hsiService.updateHouseHSI(/* appropriate houseId(s) */);
    // ... additional daily tasks
    res.status(200).json({ message: 'Daily tasks executed successfully' });
  } catch (error) {
    console.error('Error running daily tasks:', error);
    res.status(500).json({ error: 'Failed to execute daily tasks', details: error.message });
  }
};
