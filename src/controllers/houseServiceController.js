const { HouseService, House, User, ServiceRequestBundle, TakeOverRequest, StagedRequest, Task, Notification } = require('../models');
const { sendPushNotification } = require('../services/pushNotificationService');

// Create a new HouseService
exports.createHouseService = async (req, res) => {
  try {
    const { name, status, type, houseId, accountNumber, amount, dueDay, createDay, reminderDay, designatedUserId, serviceRequestBundleId, metadata } = req.body;
    


    const houseService = await HouseService.create({
      name,
      status,
      type,
      houseId,
      accountNumber,
      amount,
      dueDay,
      createDay,
      reminderDay,
      designatedUserId,
      serviceRequestBundleId,
      metadata
    });
    

    res.status(201).json({
      message: 'HouseService created successfully',
      houseService,
    });
  } catch (error) {
    console.error('[createHouseService] Error creating HouseService:', error);
    res.status(500).json({ message: 'Failed to create HouseService', error: error.message });
  }
};

// In houseServiceController.js - add this new method
// Fixed version of the getHouseServicesWithLedgersAndSummaries method
// Enhanced backend controller with house member contribution tracking
exports.getHouseServicesWithLedgersAndSummaries = async (req, res) => {
  try {
    const { houseId } = req.params;
    
    // Check if house exists
    const house = await House.findByPk(houseId);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }
    
    // Get all house members for contribution tracking
    const houseMembers = await User.findAll({
      where: { houseId },
      attributes: ['id', 'username', 'email'],
      order: [['username', 'ASC']]
    });
    
 
    
    // Get all services with their ledgers
    const houseServices = await HouseService.findAll({
      where: { houseId },
      include: [
        {
          model: User,
          as: 'designatedUser',
          attributes: ['id', 'username', 'email']
        },
        {
          model: require('../models').HouseServiceLedger,
          as: 'ledgers',
          where: { status: 'active' },
          required: false,
          attributes: ['id', 'fundingRequired', 'serviceFeeTotal', 'totalRequired', 'funded', 'status', 'metadata', 'createdAt']
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        [{ model: require('../models').HouseServiceLedger, as: 'ledgers' }, 'createdAt', 'DESC']
      ]
    });
    
    // Format the response to include calculated fields and contribution details
    const servicesWithData = houseServices.map(service => {
      const activeLedger = service.ledgers?.[0];
      
      let percentFunded = 0;
      let fundingRequired = 0;
      let funded = 0;
      let contributorDetails = [];
      let nonContributors = [];
      
      if (activeLedger) {
        fundingRequired = Number(activeLedger.totalRequired) || Number(activeLedger.fundingRequired) || 0;
        funded = Number(activeLedger.funded) || 0;
        
        // Create a map of user contributions from metadata
        const contributionMap = new Map();
        if (activeLedger.metadata?.fundedUsers?.length > 0) {
          activeLedger.metadata.fundedUsers.forEach(fundedUser => {
            contributionMap.set(fundedUser.userId, {
              userId: fundedUser.userId,
              amount: Number(fundedUser.amount) || 0,
              timestamp: fundedUser.timestamp,
              lastUpdated: fundedUser.lastUpdated,
              charges: fundedUser.charges || []
            });
          });
        }
        
      
        
        // Build detailed contributor and non-contributor lists
        houseMembers.forEach(member => {
          const contribution = contributionMap.get(member.id);
          
          if (contribution) {
            // Member has contributed
            contributorDetails.push({
              userId: member.id,
              username: member.username,
              email: member.email,
              amount: contribution.amount,
              timestamp: contribution.timestamp,
              lastUpdated: contribution.lastUpdated,
              percentOfTotal: fundingRequired > 0 
                ? Math.round((contribution.amount / fundingRequired) * 100) 
                : 0
            });
         
          } else {
            // Member hasn't contributed yet
            nonContributors.push({
              userId: member.id,
              username: member.username,
              email: member.email,
              expectedAmount: fundingRequired > 0 
                ? Math.round(fundingRequired / houseMembers.length * 100) / 100 
                : 0
            });
        
          }
        });
        
        // Calculate percentage
        if (fundingRequired > 0) {
          percentFunded = Math.round((funded / fundingRequired) * 100);
        }
      } else {
        // No active ledger - all members are non-contributors
        fundingRequired = Number(service.amount) || 0;
        funded = 0;
        percentFunded = 0;
        
        nonContributors = houseMembers.map(member => ({
          userId: member.id,
          username: member.username,
          email: member.email,
          expectedAmount: fundingRequired > 0 
            ? Math.round(fundingRequired / houseMembers.length * 100) / 100 
            : 0
        }));
      }
      
      // Sort contributors by contribution amount (highest first)
      contributorDetails.sort((a, b) => b.amount - a.amount);
      
      return {
        ...service.toJSON(),
        calculatedData: {
          percentFunded: Math.min(100, percentFunded),
          fundingRequired,
          funded,
          remainingAmount: Math.max(0, fundingRequired - funded),
          contributorCount: contributorDetails.length,
          totalHouseMembers: houseMembers.length,
          contributorDetails, // Who has contributed and how much
          nonContributors,    // Who hasn't contributed yet
          isFullyFunded: percentFunded >= 100,
          averageContribution: contributorDetails.length > 0 
            ? Math.round((funded / contributorDetails.length) * 100) / 100 
            : 0
        }
      };
    });
    
    res.status(200).json({
      houseId,
      totalHouseMembers: houseMembers.length,
      houseServices: servicesWithData
    });
  } catch (error) {
    console.error('Error fetching house services with data:', error);
    res.status(500).json({ message: 'Failed to fetch house services', error: error.message });
  }
};

// Get HouseServices by House ID
exports.getHouseServicesByHouseId = async (req, res) => {
  try {
    const { houseId } = req.params;
    
    // Check if house exists
    const house = await House.findByPk(houseId);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }
    
    // Get all services for this house
    const houseServices = await HouseService.findAll({
      where: { houseId },
      include: [
        {
          model: User,
          as: 'designatedUser',
          attributes: ['id', 'username', 'email']
        },
        {
          model: ServiceRequestBundle,
          as: 'serviceRequestBundle',
          include: [
            { model: TakeOverRequest, as: 'takeOverRequest' },
            { model: StagedRequest, as: 'stagedRequest' }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      houseId,
      houseServices
    });
  } catch (error) {
    console.error('Error fetching HouseServices for house:', error);
    res.status(500).json({ message: 'Failed to fetch HouseServices', error: error.message });
  }
};

// Get all HouseServices
exports.getAllHouseServices = async (req, res) => {
  try {
    const houseServices = await HouseService.findAll();
    res.status(200).json(houseServices);
  } catch (error) {
    console.error('Error fetching HouseServices:', error);
    res.status(500).json({ message: 'Failed to fetch HouseServices', error: error.message });
  }
};

// Get a specific HouseService by ID
// Get a specific HouseService by ID with tasks
exports.getHouseServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const houseService = await HouseService.findByPk(id, {
      include: [
        {
          model: User,
          as: 'designatedUser',
          attributes: ['id', 'username']
        },
        {
          model: require('../models').HouseServiceLedger,
          as: 'ledgers',
          where: { status: 'active' },
          required: false,
          attributes: ['id', 'fundingRequired', 'serviceFeeTotal', 'totalRequired', 'funded', 'status', 'metadata', 'createdAt']
        },
        {
          model: ServiceRequestBundle,
          as: 'serviceRequestBundle',
          include: [
            { model: TakeOverRequest, as: 'takeOverRequest' },
            { model: StagedRequest, as: 'stagedRequest' },
            { 
              model: Task, 
              as: 'tasks',
              include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'username']
              }]
            }
          ]
        }
      ]
    });
    
    if (!houseService) {
      return res.status(404).json({ message: 'HouseService not found' });
    }
    
    res.status(200).json(houseService);
  } catch (error) {
    console.error('Error fetching HouseService:', error);
    res.status(500).json({ message: 'Failed to fetch HouseService', error: error.message });
  }
};

// Update a HouseService
exports.updateHouseService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status, type, accountNumber, amount, dueDay, createDay, reminderDay, designatedUserId, metadata } = req.body;
    
    const houseService = await HouseService.findByPk(id);
    
    if (!houseService) {
      return res.status(404).json({ message: 'HouseService not found' });
    }
    
 
    // Update the fields
    await houseService.update({
      name: name || houseService.name,
      status: status || houseService.status,
      type: type || houseService.type,
      accountNumber: accountNumber !== undefined ? accountNumber : houseService.accountNumber,
      amount: amount !== undefined ? amount : houseService.amount,
      dueDay: dueDay !== undefined ? dueDay : houseService.dueDay,
      createDay: createDay !== undefined ? createDay : houseService.createDay,
      reminderDay: reminderDay !== undefined ? reminderDay : houseService.reminderDay,
      designatedUserId: designatedUserId !== undefined ? designatedUserId : houseService.designatedUserId,
      metadata: metadata || houseService.metadata
    });

    res.status(200).json({
      message: 'HouseService updated successfully',
      houseService
    });
  } catch (error) {
    console.error('Error updating HouseService:', error);
    res.status(500).json({ message: 'Failed to update HouseService', error: error.message });
  }
};

// Delete a HouseService
exports.deleteHouseService = async (req, res) => {
  try {
    const { id } = req.params;
    
    const houseService = await HouseService.findByPk(id);
    
    if (!houseService) {
      return res.status(404).json({ message: 'HouseService not found' });
    }

    await houseService.destroy();

    res.status(200).json({ message: 'HouseService deleted successfully' });
  } catch (error) {
    console.error('Error deleting HouseService:', error);
    res.status(500).json({ message: 'Failed to delete HouseService', error: error.message });
  }
};

// Create HouseService from a confirmed ServiceRequestBundle
exports.createFromServiceRequestBundle = async (serviceRequestBundleId) => {
  try {
    // Find the service request bundle with its related request
    const bundle = await ServiceRequestBundle.findByPk(serviceRequestBundleId, {
      include: [
        { model: TakeOverRequest, as: 'takeOverRequest' },
        { model: StagedRequest, as: 'stagedRequest' },
        { model: User, as: 'creator' }
      ]
    });
    
    if (!bundle) {
      console.error(`ServiceRequestBundle with ID ${serviceRequestBundleId} not found`);
      return null;
    }
    
    // Check if a HouseService already exists for this bundle
    const existingService = await HouseService.findOne({
      where: { serviceRequestBundleId }
    });
    
    if (existingService) {
     
      return existingService;
    }
    
    let houseServiceData = {
      houseId: bundle.houseId,
      serviceRequestBundleId: bundle.id,
      status: 'active',
      type: bundle.type
    };
    
    // Set properties based on the bundle type and related request
    if ((bundle.type === 'fixed_recurring' || bundle.type === 'variable_recurring') && bundle.takeOverRequest) {
      // Get dueDay from the takeover request
      const dueDay = Number(bundle.takeOverRequest.dueDate);
      
      // Common properties for both service types
      houseServiceData = {
        ...houseServiceData,
        name: bundle.takeOverRequest.serviceName,
        accountNumber: bundle.takeOverRequest.accountNumber,
        dueDay,
        designatedUserId: bundle.userId
      };
      
      // Handle specific properties based on service type
      if (bundle.type === 'fixed_recurring') {
        // For fixed services: Calculate createDay and set amount
        let createDay = (dueDay + 16) % 31;
        if (createDay === 0) createDay = 31;
        
        houseServiceData.createDay = createDay;
        houseServiceData.amount = bundle.takeOverRequest.monthlyAmount;
        
      
      } else {
        // For variable services: Calculate reminderDay (approximately 1 week before dueDay)
        let reminderDay = dueDay - 7;
        if (reminderDay <= 0) reminderDay = reminderDay + 30;
        
        houseServiceData.reminderDay = reminderDay;
        

      }
    } else if (bundle.type === 'marketplace_onetime' && bundle.stagedRequest) {
      houseServiceData = {
        ...houseServiceData,
        name: bundle.stagedRequest.serviceName,
        type: 'marketplace_onetime',
        metadata: {
          partnerName: bundle.stagedRequest.partnerName,
          partnerId: bundle.stagedRequest.partnerId,
          transactionId: bundle.stagedRequest.transactionId,
          serviceType: bundle.stagedRequest.serviceType
        }
      };
    } else {
      console.error(`Unsupported bundle type or missing related request for bundle ${serviceRequestBundleId}`);
      return null;
    }
    
    // Check if there's metadata with createDay or reminderDay override
    if (bundle.metadata && typeof bundle.metadata === 'object') {
      if (bundle.type === 'fixed_recurring' && bundle.metadata.createDay && !houseServiceData.createDay) {
        houseServiceData.createDay = Number(bundle.metadata.createDay);

      }
      
      if (bundle.type === 'variable_recurring' && bundle.metadata.reminderDay && !houseServiceData.reminderDay) {
        houseServiceData.reminderDay = Number(bundle.metadata.reminderDay);

      }
    }
    

    
    // Create the HouseService
    const houseService = await HouseService.create(houseServiceData);
    

    return houseService;
  } catch (error) {
    console.error('Error creating HouseService from ServiceRequestBundle:', error);
    return null;
  }
};

/**
 * Deactivate a House Service - Only designated user can deactivate
 * This stops bill generation for the service
 */
exports.deactivateHouseService = async (req, res) => {
  console.log('🚀 DEACTIVATE FUNCTION CALLED');
  
  try {
    console.log('🔍 DEACTIVATE TRY BLOCK ENTERED');
    
    const { serviceId } = req.params;
    const userId = req.user?.id;

    console.log('🔍 DEACTIVATE DEBUG:', {
      serviceId,
      userId,
      userExists: !!req.user,
      userType: typeof userId,
      userHouseId: req.user?.houseId,
      requestPath: req.path,
      requestMethod: req.method,
      params: req.params,
      body: req.body
    });

    // Find the house service
    const houseService = await HouseService.findByPk(serviceId);
    
    console.log('🔍 SERVICE DEBUG:', {
      found: !!houseService,
      serviceId: houseService?.id,
      serviceName: houseService?.name,
      serviceStatus: houseService?.status,
      designatedUserId: houseService?.designatedUserId,
      serviceHouseId: houseService?.houseId
    });
    
    if (!houseService) {
      return res.status(404).json({ error: 'House service not found' });
    }

    // Authorization checks
    // 1. User must be in the same house as the service
    if (req.user.houseId !== houseService.houseId) {
      return res.status(403).json({ error: 'Unauthorized - service belongs to different house' });
    }

    // 2. User must be the designated user for this service
    if (houseService.designatedUserId !== userId) {
      return res.status(403).json({ 
        error: 'Unauthorized - only the designated user can deactivate this service',
        designatedUserId: houseService.designatedUserId,
        currentUserId: userId,
        designatedUserIdType: typeof houseService.designatedUserId,
        currentUserIdType: typeof userId
      });
    }

    // 3. Service must be currently active
    if (houseService.status !== 'active') {
      return res.status(400).json({ 
        error: `Cannot deactivate service - current status is '${houseService.status}'`,
        currentStatus: houseService.status,
        statusType: typeof houseService.status,
        statusLength: houseService.status?.length,
        debugInfo: {
          serviceId: houseService.id,
          serviceName: houseService.name,
          rawStatus: JSON.stringify(houseService.status)
        }
      });
    }

    // Update the service status to inactive
    await houseService.update({
      status: 'inactive',
      metadata: {
        ...houseService.metadata,
        deactivatedAt: new Date().toISOString(),
        deactivatedBy: userId,
        deactivationReason: 'Designated user deactivated service'
      }
    });

    console.log(`House Service ${serviceId} deactivated by designated user ${userId}`);

    // Send notifications to all house members
    await sendServiceDeactivationNotifications(houseService, req.user);

    res.status(200).json({
      message: 'House service deactivated successfully',
      serviceId: houseService.id,
      serviceName: houseService.name,
      previousStatus: 'active',
      currentStatus: 'inactive',
      deactivatedAt: new Date().toISOString(),
      deactivatedBy: userId
    });

  } catch (error) {
    console.error('❌ ERROR in deactivateHouseService:', error);
    console.error('❌ ERROR STACK:', error.stack);
    res.status(500).json({ 
      error: 'Failed to deactivate house service', 
      details: error.message,
      stack: error.stack
    });
  }
};

/**
 * Reactivate a House Service - Only designated user can reactivate
 * This resumes bill generation for the service
 */
exports.reactivateHouseService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const userId = req.user.id;

    // Find the house service
    const houseService = await HouseService.findByPk(serviceId);
    
    if (!houseService) {
      return res.status(404).json({ error: 'House service not found' });
    }

    // Authorization checks
    // 1. User must be in the same house as the service
    if (req.user.houseId !== houseService.houseId) {
      return res.status(403).json({ error: 'Unauthorized - service belongs to different house' });
    }

    // 2. User must be the designated user for this service
    if (houseService.designatedUserId !== userId) {
      return res.status(403).json({ 
        error: 'Unauthorized - only the designated user can reactivate this service',
        designatedUserId: houseService.designatedUserId,
        currentUserId: userId
      });
    }

    // 3. Service must be currently inactive
    if (houseService.status !== 'inactive') {
      return res.status(400).json({ 
        error: `Cannot reactivate service - current status is '${houseService.status}'`,
        currentStatus: houseService.status
      });
    }

    // Update the service status to active
    await houseService.update({
      status: 'active',
      metadata: {
        ...houseService.metadata,
        reactivatedAt: new Date().toISOString(),
        reactivatedBy: userId,
        reactivationReason: 'Designated user reactivated service'
      }
    });

    console.log(`House Service ${serviceId} reactivated by designated user ${userId}`);

    // Send notifications to all house members
    await sendServiceReactivationNotifications(houseService, req.user);

    res.status(200).json({
      message: 'House service reactivated successfully',
      serviceId: houseService.id,
      serviceName: houseService.name,
      previousStatus: 'inactive',
      currentStatus: 'active',
      reactivatedAt: new Date().toISOString(),
      reactivatedBy: userId
    });

  } catch (error) {
    console.error('Error reactivating house service:', error);
    res.status(500).json({ 
      error: 'Failed to reactivate house service', 
      details: error.message 
    });
  }
};

/**
 * Send notifications to all house members when a service is deactivated
 */
async function sendServiceDeactivationNotifications(houseService, deactivatingUser) {
  try {
    // Get all house members
    const houseMembers = await User.findAll({
      where: { houseId: houseService.houseId },
      attributes: ['id', 'username', 'email']
    });

    const serviceName = houseService.name;
    const deactivatorName = deactivatingUser.username;

    // Send notifications to all house members (including the deactivating user for confirmation)
    for (const member of houseMembers) {
      const isDeactivatingUser = member.id === deactivatingUser.id;
      
      // Different messages for the user who deactivated vs others
      const message = isDeactivatingUser 
        ? `You have deactivated ${serviceName}. Bills will no longer be generated for this service.`
        : `${deactivatorName} has deactivated ${serviceName}. Bills will no longer be generated for this service.`;

      const title = isDeactivatingUser 
        ? 'Service Deactivated'
        : 'Roommate Deactivated Service';

      // Create database notification
      const notification = await Notification.create({
        userId: member.id,
        title: title,
        message: message,
        isRead: false,
        metadata: {
          type: 'service_deactivated',
          serviceId: houseService.id,
          serviceName: serviceName,
          deactivatedBy: deactivatingUser.id,
          deactivatedByUsername: deactivatorName,
          deactivatedAt: new Date().toISOString()
        }
      });

      // Send push notification
      try {
        await sendPushNotification(member, {
          title: title,
          message: message,
          data: {
            type: 'service_deactivated',
            serviceId: houseService.id,
            serviceName: serviceName,
            notificationId: notification.id,
            deactivatedBy: deactivatingUser.id
          }
        });

        console.log(`📱 Sent deactivation notification to ${member.username} for ${serviceName}`);
      } catch (pushError) {
        console.error(`Error sending push notification to ${member.username}:`, pushError);
      }

      // Add small delay between notifications to prevent spam
      if (houseMembers.indexOf(member) < houseMembers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Sent deactivation notifications for ${serviceName} to ${houseMembers.length} house members`);
  } catch (error) {
    console.error('Error sending service deactivation notifications:', error);
    // Don't throw error - notifications are not critical to the deactivation process
  }
}

/**
 * Send notifications to all house members when a service is reactivated
 */
async function sendServiceReactivationNotifications(houseService, reactivatingUser) {
  try {
    // Get all house members
    const houseMembers = await User.findAll({
      where: { houseId: houseService.houseId },
      attributes: ['id', 'username', 'email']
    });

    const serviceName = houseService.name;
    const reactivatorName = reactivatingUser.username;

    // Send notifications to all house members (including the reactivating user for confirmation)
    for (const member of houseMembers) {
      const isReactivatingUser = member.id === reactivatingUser.id;
      
      // Different messages for the user who reactivated vs others
      const message = isReactivatingUser 
        ? `You have reactivated ${serviceName}. Bills will resume being generated for this service.`
        : `${reactivatorName} has reactivated ${serviceName}. Bills will resume being generated for this service.`;

      const title = isReactivatingUser 
        ? 'Service Reactivated'
        : 'Roommate Reactivated Service';

      // Create database notification
      const notification = await Notification.create({
        userId: member.id,
        title: title,
        message: message,
        isRead: false,
        metadata: {
          type: 'service_reactivated',
          serviceId: houseService.id,
          serviceName: serviceName,
          reactivatedBy: reactivatingUser.id,
          reactivatedByUsername: reactivatorName,
          reactivatedAt: new Date().toISOString()
        }
      });

      // Send push notification
      try {
        await sendPushNotification(member, {
          title: title,
          message: message,
          data: {
            type: 'service_reactivated',
            serviceId: houseService.id,
            serviceName: serviceName,
            notificationId: notification.id,
            reactivatedBy: reactivatingUser.id
          }
        });

        console.log(`📱 Sent reactivation notification to ${member.username} for ${serviceName}`);
      } catch (pushError) {
        console.error(`Error sending push notification to ${member.username}:`, pushError);
      }

      // Add small delay between notifications to prevent spam
      if (houseMembers.indexOf(member) < houseMembers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Sent reactivation notifications for ${serviceName} to ${houseMembers.length} house members`);
  } catch (error) {
    console.error('Error sending service reactivation notifications:', error);
    // Don't throw error - notifications are not critical to the reactivation process
  }
}