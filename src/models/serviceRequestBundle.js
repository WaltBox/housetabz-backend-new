// src/models/ServiceRequestBundle.js
const webhookService = require('../services/webhookService');

// Helper function to create a HouseService from a bundle
// Simplified createHouseServiceFromBundle function
// Helper function to create a HouseService from a bundle
async function createHouseServiceFromBundle(bundleId, sequelize) {
  try {
    console.log('Creating HouseService for bundle:', bundleId);
    
    // Load the full bundle with its associations
    const bundle = await sequelize.models.ServiceRequestBundle.findByPk(bundleId, {
      include: [
        { model: sequelize.models.StagedRequest, as: 'stagedRequest' },
        { model: sequelize.models.TakeOverRequest, as: 'takeOverRequest' },
        { model: sequelize.models.VirtualCardRequest, as: 'virtualCardRequest' }
      ]
    });
    
    if (!bundle) {
      console.error(`ServiceRequestBundle with ID ${bundleId} not found`);
      return null;
    }
    
    // Check if a HouseService already exists for this bundle
    const existingService = await sequelize.models.HouseService.findOne({
      where: { serviceRequestBundleId: bundleId }
    });
    
    if (existingService) {
      console.log(`HouseService already exists for bundle ${bundleId}`);
      return existingService;
    }
    
    // Determine service type - default to marketplace_onetime if not set
    let serviceType = 'marketplace_onetime';
    
    // If bundle has type field with value, use it
    if (bundle.type) {
      serviceType = bundle.type;
      console.log(`Using service type from bundle: ${serviceType}`);
    } 
    // Otherwise, infer type from associated request
    else if (bundle.takeOverRequestId) {
      // Load the TakeOverRequest directly if not already loaded
      let takeOverRequest = bundle.takeOverRequest;
      if (!takeOverRequest) {
        takeOverRequest = await sequelize.models.TakeOverRequest.findByPk(bundle.takeOverRequestId);
      }
      
      if (takeOverRequest) {
        serviceType = takeOverRequest.serviceType === 'fixed' ? 'fixed_recurring' : 'variable_recurring';
        console.log(`Inferred service type from TakeOverRequest: ${serviceType}`);
      }
    } else if (bundle.stagedRequestId || bundle.virtualCardRequestId) {
      serviceType = 'marketplace_onetime';
      console.log(`Inferred service type as marketplace_onetime`);
    }
    
    // Create the base HouseService data
    let houseServiceData = {
      houseId: bundle.houseId,
      serviceRequestBundleId: bundle.id,
      status: 'active',
      type: serviceType
    };
    
    // Add fields based on associated request type
    if (bundle.takeOverRequestId) {
      // Handle TakeOverRequest-specific data
      let takeOverRequest = bundle.takeOverRequest;
      if (!takeOverRequest) {
        takeOverRequest = await sequelize.models.TakeOverRequest.findByPk(bundle.takeOverRequestId);
      }
      
      if (takeOverRequest) {
        console.log('Adding TakeOverRequest data:', takeOverRequest.serviceName);
        
        // Get due day from the takeover request
        const dueDay = Number(takeOverRequest.dueDate);
        
        // Calculate different date fields based on service type
        if (serviceType === 'fixed_recurring' || serviceType === 'variable_recurring') {
          // For all recurring services, set the due day
          houseServiceData.dueDay = dueDay;
          
          // For fixed recurring, calculate createDay
          // For variable recurring, calculate reminderDay
          if (serviceType === 'fixed_recurring') {
            let createDay = (dueDay + 16) % 31;
            if (createDay === 0) createDay = 31;
            houseServiceData.createDay = createDay;
            console.log(`Calculated createDay: ${createDay} from dueDay: ${dueDay}`);
          } else { // variable_recurring
            // Calculate reminderDay to be approximately 7 days before due date
            let reminderDay = (dueDay - 7);
            if (reminderDay <= 0) reminderDay = reminderDay + 30;
            houseServiceData.reminderDay = reminderDay;
            console.log(`Calculated reminderDay: ${reminderDay} from dueDay: ${dueDay}`);
          }
        }
        
        houseServiceData.name = takeOverRequest.serviceName;
        houseServiceData.accountNumber = takeOverRequest.accountNumber;
        houseServiceData.designatedUserId = bundle.userId;
        
        // Add amount only for fixed recurring services
        if (serviceType === 'fixed_recurring') {
          houseServiceData.amount = takeOverRequest.monthlyAmount;
        }
      } else {
        // Fallback name if TakeOverRequest not found
        houseServiceData.name = `Service ${bundleId}`;
      }
    } else if (bundle.stagedRequestId) {
      // Handle StagedRequest-specific data
      let stagedRequest = bundle.stagedRequest;
      if (!stagedRequest) {
        stagedRequest = await sequelize.models.StagedRequest.findByPk(bundle.stagedRequestId);
      }
      
      if (stagedRequest) {
        console.log('Adding StagedRequest data:', stagedRequest.serviceName);
        houseServiceData.name = stagedRequest.serviceName;
        houseServiceData.metadata = {
          partnerName: stagedRequest.partnerName,
          partnerId: stagedRequest.partnerId,
          transactionId: stagedRequest.transactionId,
          serviceType: stagedRequest.serviceType
        };
      } else {
        // Fallback name if StagedRequest not found
        houseServiceData.name = `Service ${bundleId}`;
      }
    } else if (bundle.virtualCardRequestId) {
      // Handle VirtualCardRequest-specific data
      let virtualCardRequest = bundle.virtualCardRequest;
      if (!virtualCardRequest) {
        virtualCardRequest = await sequelize.models.VirtualCardRequest.findByPk(bundle.virtualCardRequestId);
      }
      
      if (virtualCardRequest) {
        console.log('Adding VirtualCardRequest data:', virtualCardRequest.serviceName);
        houseServiceData.name = virtualCardRequest.serviceName;
        houseServiceData.metadata = {
          virtualCardId: virtualCardRequest.virtualCardId,
          serviceType: virtualCardRequest.serviceType
        };
      } else {
        // Fallback name if VirtualCardRequest not found
        houseServiceData.name = `Service ${bundleId}`;
      }
    } else {
      // Fallback for cases with no specific request type
      houseServiceData.name = `Service ${bundleId}`;
    }
    
    // Check if metadata has createDay or reminderDay (from the takeOverRequestController)
    if (bundle.metadata && typeof bundle.metadata === 'object') {
      console.log('Bundle metadata:', bundle.metadata);
      if (bundle.metadata.createDay && !houseServiceData.createDay && serviceType === 'fixed_recurring') {
        houseServiceData.createDay = Number(bundle.metadata.createDay);
        console.log(`Using createDay from metadata: ${houseServiceData.createDay}`);
      }
      if (bundle.metadata.reminderDay && !houseServiceData.reminderDay && serviceType === 'variable_recurring') {
        houseServiceData.reminderDay = Number(bundle.metadata.reminderDay);
        console.log(`Using reminderDay from metadata: ${houseServiceData.reminderDay}`);
      }
    }
    
    console.log('Final HouseService data:', JSON.stringify(houseServiceData, null, 2));
    
    // Create the HouseService
    const houseService = await sequelize.models.HouseService.create(houseServiceData);
    
    console.log(`HouseService created successfully with ID ${houseService.id}`);
    return houseService;
  } catch (error) {
    console.error('Error creating HouseService from ServiceRequestBundle:', error);
    return null;
  }
}

module.exports = (sequelize, DataTypes) => {
  const ServiceRequestBundle = sequelize.define('ServiceRequestBundle', {
    houseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'House ID is required' }
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'User ID is required' }
      }
    },
    stagedRequestId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'StagedRequests',
        key: 'id'
      }
    },
    virtualCardRequestId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'VirtualCardRequests',
        key: 'id'
      }
    },
    takeOverRequestId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'TakeOverRequests',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: {
          args: [['pending', 'accepted', 'rejected']],
          msg: 'Status must be either pending, accepted, or rejected'
        }
      }
    },
    totalPaidUpfront: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      get() {
        const value = this.getDataValue('totalPaidUpfront');
        return value === null ? 0.00 : Number(value);
      },
      set(value) {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          throw new Error('Invalid numeric value for totalPaidUpfront');
        }
        this.setDataValue('totalPaidUpfront', numValue.toFixed(2));
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'marketplace_onetime',
      validate: {
        isIn: {
          args: [['marketplace_onetime', 'fixed_recurring', 'variable_recurring']],
          msg: 'Type must be either marketplace_onetime, fixed_recurring, or variable_recurring'
        }
      }
    }
  });

  ServiceRequestBundle.associate = function(models) {
    ServiceRequestBundle.belongsTo(models.StagedRequest, {
      foreignKey: 'stagedRequestId',
      as: 'stagedRequest'
    });
    ServiceRequestBundle.belongsTo(models.VirtualCardRequest, {
      foreignKey: 'virtualCardRequestId',
      as: 'virtualCardRequest'
    });
    ServiceRequestBundle.belongsTo(models.TakeOverRequest, {
      foreignKey: 'takeOverRequestId',
      as: 'takeOverRequest'
    });
    ServiceRequestBundle.hasMany(models.Task, {
      foreignKey: 'serviceRequestBundleId',
      as: 'tasks'
    });
    ServiceRequestBundle.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'creator'
    });
    // Add association to HouseService
    ServiceRequestBundle.hasOne(models.HouseService, {
      foreignKey: 'serviceRequestBundleId',
      as: 'houseService'
    });
  };

  ServiceRequestBundle.prototype.updateStatusIfAllTasksCompleted = async function(options = {}) {
    const transaction = options.transaction;
    try {
      // Get all tasks and relevant request type
      const [tasks, stagedRequest, virtualCardRequest, takeOverRequest] = await Promise.all([
        sequelize.models.Task.findAll({
          where: { serviceRequestBundleId: this.id },
          transaction
        }),
        this.stagedRequestId ? sequelize.models.StagedRequest.findByPk(this.stagedRequestId, { transaction }) : null,
        this.virtualCardRequestId ? sequelize.models.VirtualCardRequest.findByPk(this.virtualCardRequestId, { transaction }) : null,
        this.takeOverRequestId ? sequelize.models.TakeOverRequest.findByPk(this.takeOverRequestId, { transaction }) : null
      ]);
  
      // Get the relevant request (either staged, virtual card, or take over)
      const request = stagedRequest || virtualCardRequest || takeOverRequest;
      if (!request) return;
  
      // Calculate total paid based on tasks with completed payments
      const totalPaid = tasks
        .filter(task => task.paymentStatus === 'completed')
        .reduce((sum, task) => sum + Number(task.paymentAmount || 0), 0);
  
      // Check conditions: all tasks are complete, accepted, and required payments are met
      const allTasksComplete = tasks.every(task => task.status === true);
      const allTasksAccepted = tasks.every(task => task.response === 'accepted');
      const requiredPayment = Number(request.requiredUpfrontPayment || 0);
      const allPaymentsMet = totalPaid >= requiredPayment;
  
      console.log('Status check:', {
        bundleId: this.id,
        totalPaid,
        requiredPayment,
        allTasksComplete,
        allTasksAccepted,
        allPaymentsMet,
        taskCount: tasks.length,
        requestType: stagedRequest ? 'staged' : virtualCardRequest ? 'virtual_card' : 'take_over'
      });
  
      // Update the totalPaidUpfront if there is a discrepancy
      if (Number(this.totalPaidUpfront) !== totalPaid) {
        await this.update({ totalPaidUpfront: totalPaid.toFixed(2) }, { transaction });
      }
  
      // If every task is complete, accepted, and payments meet the required amount,
      // update the bundle and the related request
      if (allTasksComplete && allTasksAccepted && allPaymentsMet) {
        const previousStatus = this.status;
        const updates = [
          this.update({ status: 'accepted' }, { transaction })
        ];
  
        if (stagedRequest) {
          // For staged requests, update status
          updates.push(stagedRequest.update({ status: 'authorized' }, { transaction }));
          
          // Find the associated HouseService
          const houseService = await sequelize.models.HouseService.findOne({
            where: { serviceRequestBundleId: this.id },
            transaction
          });
          
          if (houseService) {
            // Update HouseService status to active
            updates.push(houseService.update({ status: 'active' }, { transaction }));
            
            // Prepare webhook to be sent after transaction commits
            transaction.afterCommit(async () => {
              try {
                // Send request.authorized webhook with correct format
                console.log(`Sending request.authorized webhook for houseTabzAgreementId: ${houseService.houseTabzAgreementId}`);
                
                await webhookService.sendWebhook(
                  stagedRequest.partnerId,
                  'request.authorized',
                  {
                    houseTabzAgreementId: houseService.houseTabzAgreementId,
                    externalAgreementId: houseService.externalAgreementId || null,
                    transactionId: stagedRequest.transactionId,
                    status: 'authorized',
                    serviceName: stagedRequest.serviceName,
                    serviceType: stagedRequest.serviceType
                  }
                );
              } catch (error) {
                console.error('Error sending request.authorized webhook:', error);
              }
            });
          } else {
            console.error(`HouseService not found for ServiceRequestBundle ${this.id}`);
          }
        } else if (virtualCardRequest) {
          // For virtual card requests, update status and create card
          try {
            const stripeHouseService = require('../services/StripeHouseService');
            updates.push(virtualCardRequest.update({ status: 'active' }, { transaction }));
            
            // Create the virtual card
            const card = await stripeHouseService.createVirtualCard(virtualCardRequest.id);
            console.log('Virtual card created:', card);
          } catch (error) {
            console.error('Error creating virtual card:', error);
            throw error;
          }
        } else if (takeOverRequest) {
          // For take over requests, just update the status
          updates.push(takeOverRequest.update({ status: 'active' }, { transaction }));
        }
  
        await Promise.all(updates);
        
        // IMPORTANT: Update HouseService status if it exists
        if (previousStatus !== 'accepted' && !houseService) {
          try {
            // Find the existing HouseService (only if not already found above)
            const houseService = await sequelize.models.HouseService.findOne({
              where: { serviceRequestBundleId: this.id },
              transaction
            });
            
            if (houseService) {
              await houseService.update({ status: 'active' }, { transaction });
              console.log(`Updated HouseService ID ${houseService.id} status to active`);
            }
          } catch (error) {
            console.error('Error updating HouseService status:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error updating bundle status:', error);
    }
  };

  return ServiceRequestBundle;
};