const { Task, ServiceRequestBundle, User, PaymentMethod, sequelize } = require('./src/models');

// Simulate the exact logic from taskController.acceptTask
async function simulateTaskAcceptance() {
  try {
    const userId = 16;
    const taskId = 188;
    
    console.log(`🚀 Running script in ${process.env.NODE_ENV || 'development'} environment`);
    console.log(`🔍 Simulating real task acceptance for Task ID ${taskId}, User ID ${userId}...`);
    
    // Start transaction (like the real controller)
    const transaction = await sequelize.transaction();
    
    try {
      // Find the task with all necessary includes (like real controller)
      const task = await Task.findOne({
        where: { id: taskId },
        include: [
          {
            model: ServiceRequestBundle,
            as: 'serviceRequestBundle',
            include: [
              {
                model: Task,
                as: 'tasks'
              }
            ]
          }
        ],
        transaction
      });

      if (!task) {
        console.log(`❌ Task ID ${taskId} not found`);
        await transaction.rollback();
        return;
      }

      // Authorization check (like real controller)
      if (task.userId !== userId) {
        console.log(`❌ Unauthorized - Task ${taskId} belongs to user ${task.userId}, not ${userId}`);
        await transaction.rollback();
        return;
      }

      console.log(`✅ Found task: ${JSON.stringify({
        id: task.id,
        userId: task.userId,
        status: task.status,
        paymentStatus: task.paymentStatus,
        paymentRequired: task.paymentRequired,
        amount: task.amount,
        stripePaymentIntentId: task.stripePaymentIntentId
      }, null, 2)}`);

      // Check if task is already accepted
      if (task.status === true) {
        console.log(`⚠️  Task is already accepted`);
        await transaction.rollback();
        return;
      }

      // SIMULATE THE EXACT REAL FLOW:
      if (task.paymentRequired && task.paymentStatus === 'pending') {
        console.log(`💳 Task requires payment - simulating payment consent flow...`);
        
        // This is where the real flow would:
        // 1. Call stripeService.createPaymentIntentForConsent
        // 2. Set paymentStatus to 'authorized' 
        // 3. Store stripePaymentIntentId
        // 4. Call checkAndCaptureAllPayments
        
        // For simulation, let's just update the database as if Stripe succeeded
        const simulatedPaymentIntentId = `pi_simulated_${taskId}_${userId}_${Date.now()}`;
        
        await task.update({
          status: true,
          paymentStatus: 'authorized',
          stripePaymentIntentId: simulatedPaymentIntentId
        }, { transaction });

        console.log(`✅ Task updated with payment consent:`);
        console.log(`   - Status: false → true`);
        console.log(`   - Payment Status: pending → authorized`);
        console.log(`   - Stripe Payment Intent: ${simulatedPaymentIntentId} (simulated)`);

        // Now check if all tasks are authorized (like checkAndCaptureAllPayments)
        const allTasks = await Task.findAll({
          where: {
            serviceRequestBundleId: task.serviceRequestBundleId
          },
          transaction
        });

        console.log(`📊 Checking bundle status for payment capture:`);
        console.log(`   - Bundle ID: ${task.serviceRequestBundleId}`);
        console.log(`   - Total tasks: ${allTasks.length}`);
        
        let allAuthorized = true;
        allTasks.forEach(t => {
          const isReady = !t.paymentRequired || t.paymentStatus === 'authorized' || t.paymentStatus === 'completed';
          console.log(`   - Task ${t.id} (User ${t.userId}): status=${t.status}, paymentStatus=${t.paymentStatus || 'N/A'}, ready=${isReady}`);
          if (!isReady) allAuthorized = false;
        });

        console.log(`   - All tasks authorized: ${allAuthorized}`);
        
        if (allAuthorized) {
          console.log(`🎉 ALL TASKS AUTHORIZED! Ready for simultaneous payment capture!`);
          console.log(`🚀 In real flow, this would call stripeService.captureMultiplePaymentIntents()`);
          
          // This is where the real flow would capture all payment intents
          // and update all tasks to paymentStatus: 'completed'
          console.log(`💰 Simulating simultaneous payment capture for all authorized tasks...`);
          
          for (const t of allTasks) {
            if (t.paymentRequired && t.paymentStatus === 'authorized') {
              await t.update({
                paymentStatus: 'completed'
              }, { transaction });
              console.log(`   ✅ Task ${t.id} payment captured (simulated)`);
            }
          }
          
          console.log(`🎊 All payments captured! Bundle is complete!`);
        } else {
          console.log(`⏳ Waiting for other users to accept their tasks before capturing payments`);
        }
        
      } else {
        // No payment required - just accept the task
        console.log(`✅ No payment required - accepting task directly`);
        await task.update({
          status: true
        }, { transaction });
      }

      await transaction.commit();
      console.log(`✅ Transaction committed successfully - task acceptance complete!`);

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error(`❌ Error simulating task acceptance:`, error);
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Run the simulation
simulateTaskAcceptance();