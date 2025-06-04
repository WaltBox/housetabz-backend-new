const { HouseService, House, User, ServiceRequestBundle, TakeOverRequest, StagedRequest, Task } = require('../models');

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