// test-create-bill-submission.js
const { BillSubmission, HouseService, sequelize } = require('../../src/models');

async function createTestBillSubmission() {
  try {
    // Check if HouseService exists
    const service = await HouseService.findByPk(3);
    if (!service) {
      console.error('HouseService with ID 3 not found');
      return;
    }

    // Calculate due date (15 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    // Create the BillSubmission
    const billSubmission = await BillSubmission.create({
      houseServiceId: 16,
      userId: 5,
      status: 'pending',
      dueDate,
      metadata: {
        serviceName: service.name,
        month: dueDate.getMonth() + 1,
        year: dueDate.getFullYear(),
        testSubmission: true
      }
    });

    console.log('Test BillSubmission created successfully:');
    console.log(JSON.stringify(billSubmission.toJSON(), null, 2));

    // Close the database connection
    await sequelize.close();
  } catch (error) {
    console.error('Error creating test BillSubmission:', error);
    process.exit(1);
  }
}

createTestBillSubmission();