// src/services/PaymentStateService.js
const { ServiceRequestBundle, StagedRequest, Task, Payment } = require('../models');
const { sequelize } = require('../models');

class PaymentStateService {
  /**
   * Updates service request bundle status based on payment completion
   */
  async updateBundleStatus(bundleId) {
    const transaction = await sequelize.transaction();
    
    try {
      const bundle = await ServiceRequestBundle.findByPk(bundleId, {
        include: [
          {
            model: StagedRequest,
            as: 'stagedRequest'
          },
          {
            model: Task,
            as: 'tasks',
            include: [
              {
                model: Payment,
                where: { status: 'completed' },
                required: false
              }
            ]
          }
        ],
        transaction
      });

      if (!bundle) {
        throw new Error('Service request bundle not found');
      }

      // Calculate total paid amount
      const totalPaid = bundle.tasks.reduce((sum, task) => {
        const completedPayment = task.Payments?.find(p => p.status === 'completed');
        return sum + (completedPayment ? parseFloat(completedPayment.amount) : 0);
      }, 0);

      // Update bundle's totalPaidUpfront
      bundle.totalPaidUpfront = totalPaid;

      // Check if required amount is met
      const requiredAmount = bundle.stagedRequest.requiredUpfrontPayment;
      const isFullyPaid = totalPaid >= requiredAmount;

      // Update bundle status
      if (isFullyPaid) {
        bundle.status = 'ready_for_activation';
        // Also update staged request status
        await bundle.stagedRequest.update(
          { status: 'authorized' },
          { transaction }
        );
      }

      await bundle.save({ transaction });
      await transaction.commit();

      return {
        bundleId: bundle.id,
        totalPaid,
        requiredAmount,
        isFullyPaid,
        status: bundle.status
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Processes individual payment completion
   */
  async handlePaymentCompletion(paymentId) {
    const transaction = await sequelize.transaction();
    
    try {
      const payment = await Payment.findByPk(paymentId, {
        include: [{
          model: Task,
          as: 'task',
          include: [{
            model: ServiceRequestBundle,
            as: 'serviceRequestBundle'
          }]
        }],
        transaction
      });

      if (!payment || !payment.task) {
        throw new Error('Payment or associated task not found');
      }

      // Update payment status
      payment.status = 'completed';
      payment.paymentDate = new Date();
      await payment.save({ transaction });

      // Update task status
      const task = payment.task;
      task.paymentStatus = 'completed';
      if (task.response === 'accepted') {
        task.status = true;
      }
      await task.save({ transaction });

      // Update bundle status
      if (task.serviceRequestBundle) {
        await this.updateBundleStatus(task.serviceRequestBundle.id);
      }

      await transaction.commit();
      return payment;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Check if all roommates have pledged and paid
   */
  async checkAllRoommatesReady(bundleId) {
    const bundle = await ServiceRequestBundle.findByPk(bundleId, {
      include: [{
        model: Task,
        as: 'tasks'
      }]
    });

    if (!bundle) {
      throw new Error('Bundle not found');
    }

    const allTasks = bundle.tasks;
    const allPledged = allTasks.every(task => task.pledged);
    const allPaid = allTasks.every(task => 
      !task.paymentRequired || task.paymentStatus === 'completed'
    );

    return {
      allPledged,
      allPaid,
      totalTasks: allTasks.length,
      pledgedCount: allTasks.filter(t => t.pledged).length,
      paidCount: allTasks.filter(t => 
        !t.paymentRequired || t.paymentStatus === 'completed'
      ).length
    };
  }
}

module.exports = new PaymentStateService();