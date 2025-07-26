// src/controllers/userController.js
const { User, House, Charge, Task, UserFinance, HouseFinance, HouseStatusIndex, Bill } = require('../models');
const { Op } = require('sequelize');  // Add this import

// Create a new user
exports.createUser = async (req, res, next) => {
  try {
    const { username, email, password, phoneNumber } = req.body;

    // Validate required fields
    if (!username || !email || !password || !phoneNumber) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate phone number format
    if (!/^[\+]?[1-9][\d]{0,15}$/.test(phoneNumber)) {
      return res.status(400).json({ message: 'Please enter a valid phone number' });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Create user with password
    const user = await User.create({
      username,
      email,
      password, // Will be hashed by User model's beforeCreate hook
      phoneNumber: phoneNumber.trim() // Trim whitespace
    });

    // Return user without password
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    next(error);
  }
};

// Rest of your controller methods remain the same...
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'phoneNumber']
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'phoneNumber', 'houseId', 'onboarded', 'onboarding_step', 'onboarded_at'],
      include: [
        {
          model: House,
          as: 'house',
          attributes: ['id', 'name']
        },
        {
          model: Charge,
          as: 'charges',
          attributes: ['id', 'amount', 'status', 'billId', 'name', 'dueDate', 'baseAmount', 'serviceFee', 'advanced']
        },
        {
          model: UserFinance,  // Include the finance data
          as: 'finance',
          attributes: ['balance', 'credit', 'points']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    next(error);
  }
};


// In userController.js - COMPLETE FIXED getDashboardData method
// Replace the entire getDashboardData method in your userController.js with this:

exports.getDashboardData = async (req, res, next) => {
  try {
    const userId = req.params.id;
    console.log('=== getDashboardData called ===');
    console.log('User ID:', userId);
    
    // Get user with finance and house data
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'houseId'],
      include: [
        {
          model: UserFinance,
          as: 'finance',
          attributes: ['balance', 'credit', 'points'],
          required: false
        },
        {
          model: House,
          as: 'house',
          attributes: ['id', 'name'],
          include: [
            {
              model: HouseFinance,
              as: 'finance',
              attributes: ['balance', 'ledger'],
              required: false
            },
            {
              model: HouseStatusIndex,
              as: 'statusIndex',
              attributes: ['score', 'bracket', 'feeMultiplier', 'creditMultiplier'],
              required: false
            }
          ],
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User found:', user.username);
    console.log('User house:', user.house?.name);

    // Get user-specific data (always fetch these)
    const dataPromises = [
      // Tasks - FIXED with correct column names
      Task.findAll({
        where: { 
          userId,
          status: false // Only pending tasks
        },
        attributes: [
          'id', 'type', 'status', 'userId', 'serviceRequestBundleId',
          'response', 'paymentRequired', 'paymentAmount', 'monthlyAmount',
          'paymentStatus', 'paymentTransactionId', 'createdAt', 'updatedAt'
        ],
        include: [
          {
            model: require('../models').ServiceRequestBundle,
            as: 'serviceRequestBundle',
            attributes: ['id', 'totalPaidUpfront', 'status', 'type', 'userId'],
            required: false,
            include: [
              {
                model: require('../models').TakeOverRequest,
                as: 'takeOverRequest',
                attributes: ['id', 'serviceName', 'serviceType', 'accountNumber', 'monthlyAmount', 'dueDate'],
                required: false
              },
              {
                model: require('../models').StagedRequest,
                as: 'stagedRequest', 
                // FIXED: Remove 'name' - it doesn't exist in StagedRequest table
                attributes: ['id', 'serviceName', 'serviceType', 'partnerName', 'partnerId', 'transactionId'],
                required: false
              },
              {
                model: require('../models').VirtualCardRequest,
                as: 'virtualCardRequest',
                attributes: ['id', 'serviceName', 'serviceType'],
                required: false
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 50
      }),
      
      // User charges
      Charge.findAll({
        where: { userId },
        attributes: ['id', 'amount', 'status', 'billId', 'name', 'baseAmount', 'dueDate'],
        order: [['createdAt', 'DESC']],
        limit: 50
      }),

      // Urgent messages for this user
      require('../models').UrgentMessage.findAll({
        where: { 
          userId: userId,
          isResolved: false // Only unresolved messages
        },
        attributes: ['id', 'type', 'title', 'body', 'isRead', 'billId', 'chargeId', 'metadata'],
        include: [
          {
            model: require('../models').Bill,
            as: 'bill',
            attributes: ['id', 'name', 'dueDate'],
            required: false
          },
          {
            model: require('../models').Charge,
            as: 'charge',
            attributes: ['id', 'amount', 'status'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 20
      }),

      // Bill submissions for this user
      require('../models').BillSubmission.findAll({
        where: { 
          userId: userId,
          status: 'pending' // Only pending bill submissions
        },
        attributes: ['id', 'houseServiceId', 'status', 'amount', 'dueDate', 'metadata'],
        include: [
          {
            model: require('../models').HouseService,
            as: 'houseService',
            attributes: ['id', 'name', 'type'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 20
      })
    ];

    // Add house-specific queries if user has a house
    if (user.houseId) {
      console.log('Fetching house bills for house:', user.houseId);
      
      // Add unpaid bills query with correct User alias
      dataPromises.push(
        Bill.findAll({
          where: { 
            houseId: user.houseId,
            status: { [Op.in]: ['pending', 'partial_paid'] }
          },
          include: [
            {
              model: Charge,
              attributes: ['id', 'amount', 'status', 'userId'],
              where: {
                status: { [Op.in]: ['unpaid', 'processing'] }
              },
              required: false,
              include: [
                {
                  model: User,
                  as: 'User', // Use capital 'U' 
                  attributes: ['id', 'username'],
                  required: false
                }
              ]
            }
          ],
          attributes: ['id', 'name', 'amount', 'dueDate', 'status', 'baseAmount'],
          order: [['dueDate', 'ASC']],
          limit: 50
        })
      );
      
      // Add paid bills query
      dataPromises.push(
        Bill.findAll({
          where: { 
            houseId: user.houseId,
            status: 'paid' 
          },
          attributes: ['id', 'name', 'amount', 'dueDate', 'baseAmount', 'updatedAt'],
          order: [['updatedAt', 'DESC']],
          limit: 100
        })
      );
    } else {
      // Add empty promises if no house
      dataPromises.push(Promise.resolve([])); // unpaidBills
      dataPromises.push(Promise.resolve([])); // paidBills
    }

    // Execute all queries
    const results = await Promise.all(dataPromises);
    
    // Destructure results based on whether house data was fetched
    let tasks, userCharges, urgentMessages, billSubmissions, unpaidBills, paidBills;
    
    if (user.houseId) {
      [tasks, userCharges, urgentMessages, billSubmissions, unpaidBills, paidBills] = results;
    } else {
      [tasks, userCharges, urgentMessages, billSubmissions] = results;
      unpaidBills = [];
      paidBills = [];
    }

    console.log('Data fetched:', {
      tasks: tasks.length,
      userCharges: userCharges.length,
      urgentMessages: urgentMessages.length,
      billSubmissions: billSubmissions.length,
      unpaidBills: unpaidBills.length,
      paidBills: paidBills.length
    });

    // Add debug logging for tasks with nested data
    console.log('Tasks fetched with nested data:');
    tasks.forEach((task, index) => {
      if (index < 3) { // Log first 3 tasks for debugging
        console.log(`Task ${task.id}:`, {
          type: task.type,
          hasBundle: !!task.serviceRequestBundle,
          bundleId: task.serviceRequestBundleId,
          takeOverRequest: task.serviceRequestBundle?.takeOverRequest ? {
            id: task.serviceRequestBundle.takeOverRequest.id,
            serviceName: task.serviceRequestBundle.takeOverRequest.serviceName
          } : null,
          stagedRequest: task.serviceRequestBundle?.stagedRequest ? {
            id: task.serviceRequestBundle.stagedRequest.id,
            serviceName: task.serviceRequestBundle.stagedRequest.serviceName, // Use serviceName not name
            partnerName: task.serviceRequestBundle.stagedRequest.partnerName
          } : null,
          virtualCardRequest: task.serviceRequestBundle?.virtualCardRequest ? {
            id: task.serviceRequestBundle.virtualCardRequest.id,
            serviceName: task.serviceRequestBundle.virtualCardRequest.serviceName
          } : null
        });
      }
    });

    // Calculate house balance from unpaid bills
    let houseBalance = 0;
    if (unpaidBills.length > 0) {
      houseBalance = unpaidBills.reduce((total, bill) => {
        const billCharges = bill.Charges || [];
        const billUnpaid = billCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);
        console.log(`Bill "${bill.name}": $${billUnpaid} from ${billCharges.length} charges`);
        return total + billUnpaid;
      }, 0);
    }

    console.log('Calculated house balance:', houseBalance);

    // Map bills to match frontend expectations with User data
    const mappedUnpaidBills = unpaidBills.map(bill => ({
      ...bill.toJSON(),
      charges: (bill.Charges || []).map(charge => ({
        ...charge.toJSON(),
        User: charge.User || null,
        userName: charge.User?.username || `User ${charge.userId}`
      }))
    }));

    // Format the response
    const responseData = {
      user: {
        id: user.id,
        username: user.username,
        houseId: user.houseId,
        finance: user.finance || { balance: 0, credit: 0, points: 0 }
      },
      house: {
        ...user.house?.toJSON(),
        finance: user.house?.finance || { balance: 0, ledger: 0 },
        houseBalance // Add the calculated house balance
      },
      tasks,
      billSubmissions: billSubmissions || [],
      userCharges,
      urgentMessages: urgentMessages || [],
      unpaidBills: mappedUnpaidBills,
      paidBills
    };


    res.json(responseData);
  } catch (error) {
    console.error('=== ERROR in getDashboardData ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { username, email, phoneNumber, houseId } = req.body;
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prepare update data
    const updateData = { username, email, houseId };
    
    // Only include phoneNumber if it's provided and not empty
    if (phoneNumber && phoneNumber.trim()) {
      // Validate phone number format if provided
      if (!/^[\+]?[1-9][\d]{0,15}$/.test(phoneNumber.trim())) {
        return res.status(400).json({ message: 'Please enter a valid phone number' });
      }
      updateData.phoneNumber = phoneNumber.trim();
    }
    
    await user.update(updateData);
    
    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        houseId: user.houseId
      }
    });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateUserHouse = async (req, res) => {
  const { id } = req.params;
  const { houseId } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.houseId = houseId;
    await user.save();
    res.status(200).json({ message: 'User houseId updated', user });
  } catch (error) {
    console.error('Error updating houseId:', error);
    res.status(500).json({ message: 'Error updating houseId', error });
  }
};

// In src/controllers/userController.js
exports.joinHouse = async (req, res, next) => {
  try {
    const { house_code } = req.body;
    const userId = req.params.id;

    if (!house_code) {
      return res.status(400).json({ message: 'House code is required' });
    }

    // Find house by house_code
    const house = await require('../models').House.findOne({ where: { house_code } });
    if (!house) {
      return res.status(404).json({ message: 'House not found with that code' });
    }

    // Update user's houseId
    const user = await require('../models').User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.houseId = house.id;
    await user.save();

    // Advance onboarding step if user was on 'house' step
    try {
      await user.advanceOnboardingStep();
    } catch (error) {
      console.error('Error advancing onboarding step after joining house:', error);
      // Don't fail the house joining if onboarding step update fails
    }

    res.json({
      message: 'Joined house successfully',
      user: {
        id: user.id,
        houseId: user.houseId,
        onboarded: user.onboarded,
        onboarding_step: user.onboarding_step,
        onboarded_at: user.onboarded_at
      },
    });
  } catch (error) {
    console.error('Error joining house:', error);
    next(error);
  }
};

// Complete user onboarding
exports.completeOnboarding = async (req, res, next) => {
  try {
    const { id: userId } = req.params;
    
    // Authorization check: User can only complete their own onboarding
    if (req.user.id != userId) {
      return res.status(403).json({ 
        error: 'Unauthorized access',
        message: 'Users can only complete their own onboarding'
      });
    }

    const { User, House, PaymentMethod } = require('../models');
    const { sequelize } = require('../models');

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Find user with current onboarding status
      const user = await User.findByPk(userId, { transaction });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ 
          error: 'User not found' 
        });
      }

      // Check if user is already onboarded
      if (user.onboarded) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'User is already onboarded',
          message: 'Onboarding has already been completed',
          onboarded_at: user.onboarded_at
        });
      }

      // Validate user has a house
      if (!user.houseId) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'House required',
          message: 'User must be part of a house to complete onboarding',
          onboarding_step: 'house'
        });
      }

      // Validate house exists
      const house = await House.findByPk(user.houseId, { transaction });
      if (!house) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'Invalid house',
          message: 'User is associated with a house that does not exist'
        });
      }

      // Validate user has an active payment method
      const paymentMethod = await PaymentMethod.findOne({
        where: { userId: user.id },
        transaction
      });

      if (!paymentMethod) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'Payment method required',
          message: 'User must have at least one active payment method to complete onboarding',
          onboarding_step: 'payment'
        });
      }

      // All validations passed - complete onboarding
      const completedAt = new Date();
      await user.update({
        onboarded: true,
        onboarding_step: 'completed',
        onboarded_at: completedAt
      }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Onboarding completed successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          onboarded: true,
          onboarding_step: 'completed',
          onboarded_at: completedAt
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error completing onboarding:', error);
    next(error);
  }
};