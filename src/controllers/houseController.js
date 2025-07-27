// src/controllers/houseController.js
const { House, User, UserFinance, Bill, HouseFinance, HouseStatusIndex, Charge } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios'); // still available if needed for other calls
const { getAdvanceAllowance, getAdvanceUsage, getAdvancedCharges } = require('../services/advanceService');

// Create a new house and update the creator's houseId
exports.createHouse = async (req, res, next) => {
  try {
    // Extract the fields from the request body
    // Now only require name, city, state, zip_code, and creator_id
    const { name, city, state, zip_code, creator_id } = req.body;

    // Create the house with the provided data and set the creator_id
    const house = await House.create({
      name,
      city,
      state,
      zip_code,
      creator_id,
    });

    // Update the creator user's houseId and advance onboarding step
    const creator = await User.findByPk(creator_id);
    if (creator) {
      await creator.update({ houseId: house.id });
      
      // Advance onboarding step if user was on 'house' step
      try {
        await creator.advanceOnboardingStep();
      } catch (error) {
        console.error('Error advancing onboarding step after house creation:', error);
        // Don't fail the house creation if onboarding step update fails
      }
    }

    res.status(201).json({
      message: 'House created successfully',
      house,
    });
  } catch (error) {
    next(error);
  }
};

// Replace the existing getHouseWithTabsData method in your houseController.js with this:

// Replace your getHouseWithTabsData method with this fixed version:

exports.getHouseWithTabsData = async (req, res, next) => {
  try {
    const { houseId } = req.params;
    console.log('=== getHouseWithTabsData called ===');
    console.log('House ID:', houseId);
    
    // Get all house data in parallel
    const [house, unpaidBills, paidBills] = await Promise.all([
      // Get house with basic data
      House.findByPk(houseId, {
        include: [
          {
            model: User,
            as: 'users',
            attributes: ['id', 'username', 'email'],
            include: [
              {
                model: UserFinance,
                as: 'finance',
                attributes: ['points'],
                required: false
              }
            ]
          },
          {
            model: HouseStatusIndex,
            as: 'statusIndex',
            attributes: ['score', 'bracket', 'feeMultiplier', 'creditMultiplier'],
            required: false
          },
          {
            model: HouseFinance,
            as: 'finance',
            attributes: ['balance', 'ledger', 'lastTransactionDate'],
            required: false
          }
        ]
      }),
      
      // FIXED: Get unpaid bills with charges AND user data
      Bill.findAll({
        where: { 
          houseId,
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
                as: 'User', // FIXED: Use capital 'User' to match your dashboard code
                attributes: ['id', 'username'],
                required: false
              }
            ]
          }
        ],
        attributes: ['id', 'name', 'amount', 'dueDate', 'status', 'baseAmount'],
        order: [['dueDate', 'ASC']],
        limit: 50
      }),
      
      // Get paid bills for history
      Bill.findAll({
        where: { 
          houseId,
          status: 'paid' 
        },
        attributes: ['id', 'name', 'amount', 'dueDate', 'baseAmount', 'updatedAt'],
        order: [['updatedAt', 'DESC']],
        limit: 100
      })
    ]);

    if (!house) {
      console.log('House not found for ID:', houseId);
      return res.status(404).json({ message: 'House not found' });
    }



    // Debug the first few bills to see the structure
    if (unpaidBills.length > 0) {
      console.log('First unpaid bill structure:', {
        billId: unpaidBills[0].id,
        billName: unpaidBills[0].name,
        chargesCount: unpaidBills[0].Charges?.length || 0,
        firstChargeStructure: unpaidBills[0].Charges?.[0] ? {
          id: unpaidBills[0].Charges[0].id,
          userId: unpaidBills[0].Charges[0].userId,
          hasUser: !!unpaidBills[0].Charges[0].User,
          userName: unpaidBills[0].Charges[0].User?.username
        } : null
      });
    }

    // Calculate house balance from unpaid charges
    const houseBalance = unpaidBills.reduce((total, bill) => {
      const billCharges = bill.Charges || [];
      const billUnpaid = billCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);
      console.log(`Bill "${bill.name}": $${billUnpaid} from ${billCharges.length} charges`);
      return total + billUnpaid;
    }, 0);

    console.log('Calculated house balance:', houseBalance);

    // FIXED: Map the charges to include user data for frontend
    const mappedUnpaidBills = unpaidBills.map(bill => ({
      ...bill.toJSON(),
      charges: (bill.Charges || []).map(charge => ({
        ...charge.toJSON(),
        // FIXED: Use capital 'User' to match the association
        User: charge.User || null,
        userName: charge.User?.username || `User ${charge.userId}`
      }))
    }));

    const responseData = {
      house: {
        ...house.toJSON(),
        houseBalance
      },
      unpaidBills: mappedUnpaidBills,
      paidBills,
      summary: {
        totalUnpaidBills: unpaidBills.length,
        totalPaidBills: paidBills.length,
        houseBalance
      }
    };

 

    res.json(responseData);
  } catch (error) {
    console.error('=== ERROR in getHouseWithTabsData ===');
    console.error('House ID:', req.params.houseId);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Return more specific error information
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message || 'Something went wrong!',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
// Get house by ID with associated users and bills
exports.getHouse = async (req, res, next) => {
  try {
    const house = await House.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'username', 'email'],
          include: [
            {
              model: UserFinance,
              as: 'finance',
              attributes: ['points']
            }
          ]
        },
        {
          model: HouseStatusIndex,
          as: 'statusIndex',
          attributes: ['score', 'bracket', 'feeMultiplier', 'creditMultiplier']
        },
        {
          model: HouseFinance,
          as: 'finance',
          attributes: ['balance', 'ledger', 'lastTransactionDate']
        }
      ]
    });

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    res.json(house);
  } catch (error) {
    console.error('Error fetching house:', error);
    next(error);
  }
};

exports.getAllHouses = async (req, res, next) => {
  try {
    const houses = await House.findAll({ 
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'username', 'email']
        }
      ]
    });
    res.status(200).json(houses);
  } catch (error) {
    console.error('Error fetching all houses:', error);
    next(error);
  }
};
// Update a house (only update name, city, state, and zip_code)
exports.updateHouse = async (req, res, next) => {
  try {
    const { name, city, state, zip_code } = req.body;

    const house = await House.findByPk(req.params.id);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    await house.update({
      name,
      city,
      state,
      zip_code,
    });

    res.json({
      message: 'House updated successfully',
      house,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a house
exports.deleteHouse = async (req, res, next) => {
  try {
    const house = await House.findByPk(req.params.id);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }
    await house.destroy();
    res.json({ message: 'House deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get advance summary for a house
exports.getAdvanceSummary = async (req, res, next) => {
  try {
    const { id: houseId } = req.params;
    
    // Get house basic info with HSI data
    const house = await House.findByPk(houseId, {
      include: [
        {
          model: HouseStatusIndex,
          as: 'statusIndex',
          attributes: ['score', 'bracket', 'feeMultiplier', 'creditMultiplier'],
          required: false
        }
      ]
    });

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    // Get advance usage data
    const [advanceUsage, advancedCharges] = await Promise.all([
      getAdvanceUsage(houseId),
      getAdvancedCharges(houseId)
    ]);

    // Format the response for the frontend
    const advanceSummary = {
      houseId: parseInt(houseId),
      houseName: house.name,
      hsi: house.statusIndex ? {
        score: house.statusIndex.score,
        bracket: house.statusIndex.bracket,
        feeMultiplier: house.statusIndex.feeMultiplier,
        creditMultiplier: house.statusIndex.creditMultiplier
      } : null,
      advance: {
        totalAllowance: advanceUsage.allowance,
        currentlyAdvanced: advanceUsage.outstandingAdvanced,
        remainingAvailable: advanceUsage.remaining,
        utilizationPercentage: advanceUsage.allowance > 0 
          ? Math.round((advanceUsage.outstandingAdvanced / advanceUsage.allowance) * 100)
          : 0
      },
      advancedCharges: advancedCharges.map(charge => ({
        id: charge.id,
        amount: parseFloat(charge.amount),
        billName: charge.Bill?.name || 'Unknown Bill',
        userName: charge.User?.username || `User ${charge.userId}`,
        advancedAt: charge.advancedAt,
        dueDate: charge.dueDate
      })),
      summary: {
        totalChargesAdvanced: advancedCharges.length,
        canAdvanceMore: advanceUsage.remaining > 0,
        isNearLimit: advanceUsage.remaining < (advanceUsage.allowance * 0.1) // Less than 10% remaining
      }
    };

    res.json(advanceSummary);
  } catch (error) {
    console.error('Error fetching advance summary:', error);
    next(error);
  }
};
