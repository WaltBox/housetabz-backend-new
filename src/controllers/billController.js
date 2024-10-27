const { Bill, Charge, User, House } = require('../models');

// Create a new bill and distribute charges
exports.createBill = async (req, res, next) => {
    try {
      const { houseId } = req.params;
      const { amount } = req.body;
  
      // Create the bill for the house and house service
      const bill = await Bill.create({ houseId, amount, status: false });
  
      // Distribute the charges to each roommate
      const users = await User.findAll({ where: { houseId } });
      const numberOfUsers = users.length;
      const chargeAmount = amount / numberOfUsers;
  
      // Create charges for each user
      const charges = users.map(user => ({
        userId: user.id,
        amount: chargeAmount,
        paid: false,
        billId: bill.id,
      }));
  
      // Create charges
      const createdCharges = await Charge.bulkCreate(charges);
  
      // Update each user's balance
      for (let user of users) {
        const chargeForUser = createdCharges.find(charge => charge.userId === user.id);
        
        // Update user balance and ensure the update is saved
        user.balance += chargeForUser.amount;
        await user.save();  // Save updated balance to the database
      }
  
      // Update the house's balance by adding the bill amount
      const house = await House.findByPk(houseId);
      house.balance += amount; // Assuming House has a balance field
      await house.save();
  
      res.status(201).json({ message: 'Bill and charges created successfully', bill });
    } catch (error) {
      console.error('Error creating bill:', error);
      next(error);
    }
  };
// Get all bills for a specific house
exports.getBillsForHouse = async (req, res, next) => {
    try {
      const { houseId } = req.params;
  
      const house = await House.findByPk(houseId);
      if (!house) {
        return res.status(404).json({ message: 'House not found' });
      }
  
      const bills = await Bill.findAll({ where: { houseId } });
      res.status(200).json(bills);
    } catch (error) {
      console.error('Error fetching bills for house:', error);
      next(error);
    }
  };
  
  // Get a specific bill for a specific house
  exports.getBillForHouse = async (req, res, next) => {
    try {
      const { houseId, billId } = req.params;
  
      const house = await House.findByPk(houseId);
      if (!house) {
        return res.status(404).json({ message: 'House not found' });
      }
  
      const bill = await Bill.findOne({ where: { id: billId, houseId } });
      if (!bill) {
        return res.status(404).json({ message: 'Bill not found for this house' });
      }
  
      res.status(200).json(bill);
    } catch (error) {
      console.error('Error fetching bill for house:', error);
      next(error);
    }
  };
