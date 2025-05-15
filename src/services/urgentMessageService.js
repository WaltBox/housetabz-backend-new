// src/services/urgentMessageService.js
const { Op } = require('sequelize');
const { Charge, Bill, House, User, UrgentMessage, sequelize } = require('../models');

// Main function to generate and manage all urgent messages
async function refreshUrgentMessages() {
  await sequelize.transaction(async trx => {
    // 1. Get current data - all unpaid charges
    const overdueCharges = await findOverdueCharges();
    
    // 2. Analyze data to determine house/bill/user status
    const housesWithIssues = await analyzeHouseIssues(overdueCharges);
    
    // 3. For each house, refresh all messages to match current state
    for (const house of housesWithIssues) {
      await refreshMessagesForHouse(house);
    }
    
    // 4. Clean up any resolved messages (no longer relevant)
    await removeResolvedMessages();
  });
}

// Find all overdue charges with related data
async function findOverdueCharges() {
  return Charge.findAll({
    where: {
      dueDate: { [Op.lt]: new Date() },
      status: { [Op.ne]: 'paid' }
    },
    include: [
      { 
        model: Bill, 
        attributes: ['id', 'name', 'baseAmount', 'houseId', 'dueDate'] 
      },
      {
        model: User,
        attributes: ['id', 'username', 'email']
      }
    ]
  });
}

// Analyze data to determine house/bill/user status
async function analyzeHouseIssues(overdueCharges) {
  // Group charges by house
  const houseMap = {};
  
  // No charges, no issues
  if (!overdueCharges.length) {
    return [];
  }
  
  for (const charge of overdueCharges) {
    // Skip charges without bills
    if (!charge.Bill) {
      console.warn(`Warning: Charge ${charge.id} has no associated bill, skipping`);
      continue;
    }
    
    const houseId = charge.Bill.houseId;
    
    if (!houseMap[houseId]) {
      // Initialize house data structure
      houseMap[houseId] = {
        id: houseId,
        bills: {},
        users: {},
        totalUnpaidAmount: 0
      };
      
      // Get all users in this house
      const house = await House.findByPk(houseId, { 
        include: [{ model: User, as: 'users', attributes: ['id', 'username', 'email'] }]
      });
      
      if (house && house.users) {
        for (const user of house.users) {
          houseMap[houseId].users[user.id] = {
            id: user.id,
            username: user.username,
            email: user.email,
            unpaidCharges: [],
            totalOwed: 0
          };
        }
      }
    }
    
    // Add bill data
    const billId = charge.Bill.id;
    if (!houseMap[houseId].bills[billId]) {
      houseMap[houseId].bills[billId] = {
        id: billId,
        name: charge.Bill.name,
        totalAmount: parseFloat(charge.Bill.baseAmount),
        dueDate: charge.Bill.dueDate,
        unpaidCharges: [],
        unpaidUsers: new Set()
      };
    }
    
    // Add charge to bill
    houseMap[houseId].bills[billId].unpaidCharges.push(charge);
    houseMap[houseId].bills[billId].unpaidUsers.add(charge.userId);
    
    // Add charge to user
    if (houseMap[houseId].users[charge.userId]) {
      houseMap[houseId].users[charge.userId].unpaidCharges.push(charge);
      houseMap[houseId].users[charge.userId].totalOwed += parseFloat(charge.baseAmount);
    }
    
    // Update house total
    houseMap[houseId].totalUnpaidAmount += parseFloat(charge.baseAmount);
  }
  
  return Object.values(houseMap);
}

// Core function that refreshes all messages for a house
async function refreshMessagesForHouse(house) {
  // Get all current messages for this house to track what needs updating/removing
  const currentMessages = await UrgentMessage.findAll({
    where: { houseId: house.id }
  });
  
  // Track which messages we've updated
  const updatedMessageIds = new Set();
  
  // Process all users in the house
  const allUsers = Object.values(house.users);
  const billsWithIssues = Object.values(house.bills);
  
  // 1. Process users with unpaid charges
  const usersWithIssues = allUsers.filter(u => u.unpaidCharges.length > 0);
  
  for (const user of usersWithIssues) {
    // Handle user's own unpaid charges
    await processUserOwnCharges(user, house, billsWithIssues, currentMessages, updatedMessageIds);
    
    // Handle messages about roommates' unpaid charges
    await processUserRoommateNotifications(user, house, usersWithIssues, currentMessages, updatedMessageIds);
  }
  
  // 2. Process users with no unpaid charges (they only get roommate notifications)
  const usersWithNoIssues = allUsers.filter(u => u.unpaidCharges.length === 0);
  
  for (const user of usersWithNoIssues) {
    await processUserRoommateNotifications(user, house, usersWithIssues, currentMessages, updatedMessageIds);
  }
  
  // 3. Remove any messages that weren't updated (no longer relevant)
  const messagesToRemove = currentMessages.filter(msg => !updatedMessageIds.has(msg.id));
  
  if (messagesToRemove.length > 0) {
    // Mark as resolved
    for (const msg of messagesToRemove) {
      await msg.update({
        isRead: true,
        isResolved: true,
        body: msg.body.includes('(RESOLVED)') ? msg.body : `${msg.body} (RESOLVED)`
      });
    }
    
    console.log(`Marked ${messagesToRemove.length} messages as resolved for house ${house.id}`);
  }
}

// Process a user's own unpaid charges
async function processUserOwnCharges(user, house, billsWithIssues, currentMessages, updatedMessageIds) {
  // Group user's charges by bill
  const chargesByBill = {};
  let totalUserOwed = 0;
  
  for (const charge of user.unpaidCharges) {
    if (!chargesByBill[charge.billId]) {
      chargesByBill[charge.billId] = [];
    }
    chargesByBill[charge.billId].push(charge);
    totalUserOwed += parseFloat(charge.baseAmount);
  }
  
  // Check if user has multiple bills with unpaid charges
  const billIds = Object.keys(chargesByBill);
  
  if (billIds.length > 1) {
    // User has multiple unpaid bills - create/update consolidated message
    const existingMsg = currentMessages.find(m => 
      m.userId === user.id && m.type === 'user_multi_funding'
    );
    
    const metadata = {
      version: new Date().toISOString(),
      totalAmount: totalUserOwed,
      bills: billIds.map(billId => {
        const bill = house.bills[billId];
        const charges = chargesByBill[billId];
        const amount = charges.reduce((sum, c) => sum + parseFloat(c.baseAmount), 0);
        
        return {
          id: billId,
          name: bill ? bill.name : 'Unknown Service',
          amount: amount,
          dueDate: bill ? bill.dueDate : null
        };
      })
    };
    
    const message = {
      userId: user.id,
      houseId: house.id,
      billId: parseInt(billIds[0]),
      chargeId: chargesByBill[billIds[0]][0].id,
      type: 'user_multi_funding',
      title: 'Funding Required',
      body: `You have ${billIds.length} services missing your funding totaling $${totalUserOwed.toFixed(2)}`,
      metadata: JSON.stringify(metadata),
      isResolved: false
    };
    
    const updatedMsg = await upsertMessage(existingMsg, message, updatedMessageIds);
    if (updatedMsg) updatedMessageIds.add(updatedMsg.id);
  } else if (billIds.length === 1) {
    // User has a single bill with unpaid charges - create individual message
    const billId = billIds[0];
    const bill = house.bills[billId];
    const charges = chargesByBill[billId];
    const totalAmount = charges.reduce((sum, c) => sum + parseFloat(c.baseAmount), 0);
    
    const existingMsg = currentMessages.find(m => 
      m.userId === user.id && 
      m.type === 'charge_funding' &&
      m.billId === parseInt(billId)
    );
    
    const metadata = {
      version: new Date().toISOString(),
      billName: bill ? bill.name : 'Unknown Service',
      amount: totalAmount,
      dueDate: bill ? bill.dueDate : null
    };
    
    const message = {
      userId: user.id,
      houseId: house.id,
      billId: parseInt(billId),
      chargeId: charges[0].id,
      type: 'charge_funding',
      title: 'Funding Overdue',
      body: `Your funding for ${bill ? bill.name : 'a service'} ($${totalAmount.toFixed(2)}) is overdue`,
      metadata: JSON.stringify(metadata),
      isResolved: false
    };
    
    const updatedMsg = await upsertMessage(existingMsg, message, updatedMessageIds);
    if (updatedMsg) updatedMessageIds.add(updatedMsg.id);
  }
}

// Process notifications about roommates' unpaid charges
async function processUserRoommateNotifications(user, house, usersWithIssues, currentMessages, updatedMessageIds) {
  // Filter out the current user to get only roommates with issues
  const roommatesWithIssues = usersWithIssues.filter(u => u.id !== user.id);
  
  if (roommatesWithIssues.length === 0) {
    // No roommates with issues - no notifications needed
    return;
  }
  
  // Get all bills with roommate issues
  const roommatesBillIds = new Set();
  for (const roommate of roommatesWithIssues) {
    for (const charge of roommate.unpaidCharges) {
      roommatesBillIds.add(charge.billId);
    }
  }
  
  // If multiple roommates have unpaid charges across multiple bills
  if (roommatesWithIssues.length > 1 && roommatesBillIds.size > 1) {
    // Create house-wide notification about multiple roommates with multiple bills
    const existingMsg = currentMessages.find(m => 
      m.userId === user.id && m.type === 'house_multi_roommate_funding'
    );
    
    const totalRoommatesOwed = roommatesWithIssues.reduce((total, roommate) => 
      total + roommate.unpaidCharges.reduce((sum, charge) => 
        sum + parseFloat(charge.baseAmount), 0), 0);
    
    const metadata = {
      version: new Date().toISOString(),
      totalAmount: totalRoommatesOwed,
      roommates: roommatesWithIssues.map(r => ({
        id: r.id,
        name: r.username,
        amount: r.unpaidCharges.reduce((sum, c) => sum + parseFloat(c.baseAmount), 0),
        billCount: new Set(r.unpaidCharges.map(c => c.billId)).size
      })),
      bills: [...roommatesBillIds].map(billId => {
        const bill = house.bills[billId];
        return {
          id: billId,
          name: bill ? bill.name : 'Unknown Service',
          unpaidCount: roommatesWithIssues.filter(r => 
            r.unpaidCharges.some(c => c.billId === billId)).length
        };
      })
    };
    
    const message = {
      userId: user.id,
      houseId: house.id,
      billId: parseInt([...roommatesBillIds][0]),
      chargeId: roommatesWithIssues[0].unpaidCharges[0].id,
      type: 'house_multi_roommate_funding',
      title: 'House Funding Alert',
      body: `${roommatesWithIssues.length} roommates are missing funding for ${roommatesBillIds.size} services`,
      metadata: JSON.stringify(metadata),
      isResolved: false
    };
    
    const updatedMsg = await upsertMessage(existingMsg, message, updatedMessageIds);
    if (updatedMsg) updatedMessageIds.add(updatedMsg.id);
  } 
  // If we have multiple roommates with issues on a single bill
  else if (roommatesWithIssues.length > 1 && roommatesBillIds.size === 1) {
    // Create a notification about multiple roommates with one bill
    const billId = [...roommatesBillIds][0];
    const bill = house.bills[billId];
    
    const existingMsg = currentMessages.find(m => 
      m.userId === user.id && 
      m.type === 'bill_multi_funding' &&
      m.billId === parseInt(billId)
    );
    
    const totalUnpaid = roommatesWithIssues.reduce((total, roommate) => 
      total + roommate.unpaidCharges.filter(c => c.billId === billId)
        .reduce((sum, c) => sum + parseFloat(c.baseAmount), 0), 0);
    
    const metadata = {
      version: new Date().toISOString(),
      billName: bill ? bill.name : 'Unknown Service',
      dueDate: bill ? bill.dueDate : null,
      totalUnpaid: totalUnpaid,
      roommates: roommatesWithIssues.map(r => ({
        id: r.id,
        name: r.username,
        amount: r.unpaidCharges.filter(c => c.billId === billId)
          .reduce((sum, c) => sum + parseFloat(c.baseAmount), 0)
      }))
    };
    
    const message = {
      userId: user.id,
      houseId: house.id,
      billId: parseInt(billId),
      chargeId: roommatesWithIssues[0].unpaidCharges.find(c => c.billId === billId).id,
      type: 'bill_multi_funding',
      title: 'Service Funding Alert',
      body: `${bill ? bill.name : 'A service'} is missing funding from ${roommatesWithIssues.length} roommates`,
      metadata: JSON.stringify(metadata),
      isResolved: false
    };
    
    const updatedMsg = await upsertMessage(existingMsg, message, updatedMessageIds);
    if (updatedMsg) updatedMessageIds.add(updatedMsg.id);
  }
  // If one roommate has issues with multiple bills
  else if (roommatesWithIssues.length === 1 && roommatesBillIds.size > 1) {
    // Create a notification about one roommate with multiple bills
    const roommate = roommatesWithIssues[0];
    
    // Find existing message by checking metadata for the roommate ID
    const existingMsg = currentMessages.find(m => {
      if (m.userId === user.id && m.type === 'roommate_multi_funding') {
        try {
          const metadata = JSON.parse(m.metadata || '{}');
          return metadata.roommateId === roommate.id;
        } catch (e) {
          return false;
        }
      }
      return false;
    });
    
    const totalOwed = roommate.unpaidCharges.reduce((sum, c) => 
      sum + parseFloat(c.baseAmount), 0);
    
    const metadata = {
      version: new Date().toISOString(),
      roommateId: roommate.id,
      roommateName: roommate.username,
      totalAmount: totalOwed,
      bills: [...roommatesBillIds].map(billId => {
        const bill = house.bills[billId];
        const charges = roommate.unpaidCharges.filter(c => c.billId === billId);
        const amount = charges.reduce((sum, c) => sum + parseFloat(c.baseAmount), 0);
        
        return {
          id: billId,
          name: bill ? bill.name : 'Unknown Service',
          amount: amount,
          dueDate: bill ? bill.dueDate : null
        };
      })
    };
    
    const message = {
      userId: user.id,
      houseId: house.id,
      billId: parseInt([...roommatesBillIds][0]),
      chargeId: roommate.unpaidCharges[0].id,
      type: 'roommate_multi_funding',
      title: 'Roommate Funding Alert',
      body: `${roommate.username} is missing funding for ${roommatesBillIds.size} services totaling $${totalOwed.toFixed(2)}`,
      metadata: JSON.stringify(metadata),
      isResolved: false
    };
    
    const updatedMsg = await upsertMessage(existingMsg, message, updatedMessageIds);
    if (updatedMsg) updatedMessageIds.add(updatedMsg.id);
  }
  // If one roommate has issues with one bill
  else if (roommatesWithIssues.length === 1 && roommatesBillIds.size === 1) {
    // Create a notification about one roommate with one bill
    const roommate = roommatesWithIssues[0];
    const billId = [...roommatesBillIds][0];
    const bill = house.bills[billId];
    const charges = roommate.unpaidCharges.filter(c => c.billId === billId);
    const amount = charges.reduce((sum, c) => sum + parseFloat(c.baseAmount), 0);
    
    // Find existing message about this specific roommate and bill
    const existingMsg = currentMessages.find(m => {
      if (m.userId === user.id && m.type === 'single_funding' && m.billId === parseInt(billId)) {
        try {
          const metadata = JSON.parse(m.metadata || '{}');
          return metadata.unpaidUser?.id === roommate.id;
        } catch (e) {
          return false;
        }
      }
      return false;
    });
    
    const metadata = {
      version: new Date().toISOString(),
      billName: bill ? bill.name : 'Unknown Service',
      dueDate: bill ? bill.dueDate : null,
      unpaidUser: {
        id: roommate.id,
        name: roommate.username,
        amount: amount
      }
    };
    
    const message = {
      userId: user.id,
      houseId: house.id,
      billId: parseInt(billId),
      chargeId: charges[0].id,
      type: 'single_funding',
      title: 'Service Funding Alert',
      body: `${bill ? bill.name : 'A service'} is missing funding from ${roommate.username} ($${amount.toFixed(2)})`,
      metadata: JSON.stringify(metadata),
      isResolved: false
    };
    
    const updatedMsg = await upsertMessage(existingMsg, message, updatedMessageIds);
    if (updatedMsg) updatedMessageIds.add(updatedMsg.id);
  }
}

// Helper function to create or update a message
async function upsertMessage(existingMessage, newMessage, updatedMessageIds) {
  try {
    if (existingMessage) {
      // Update existing message if the content has changed
      if (existingMessage.body !== newMessage.body || 
          existingMessage.title !== newMessage.title || 
          existingMessage.metadata !== newMessage.metadata ||
          existingMessage.isResolved) {
        
        await existingMessage.update({
          title: newMessage.title,
          body: newMessage.body,
          isRead: false, // Mark as unread since it's been updated
          isResolved: false, // Ensure it's not marked as resolved
          metadata: newMessage.metadata
        });
        console.log(`Updated urgent message ID ${existingMessage.id} for user ${newMessage.userId}`);
      } else {
        console.log(`No changes needed for message ID ${existingMessage.id}`);
      }
      return existingMessage;
    } else {
      // Create new message
      const message = await UrgentMessage.create(newMessage);
      console.log(`Created new urgent message ID ${message.id} for user ${newMessage.userId}`);
      return message;
    }
  } catch (error) {
    console.error(`Error upserting urgent message for user ${newMessage.userId}:`, error);
    // Don't throw error, return null to indicate failure
    return null;
  }
}

// Remove messages that are no longer relevant
async function removeResolvedMessages() {
  try {
    // Find all charges that are paid
    const paidCharges = await Charge.findAll({
      where: { status: 'paid' }
    });
    
    if (paidCharges.length === 0) {
      console.log('No paid charges found, skipping cleanup');
      return;
    }
    
    // Get IDs of paid charges
    const paidChargeIds = paidCharges.map(c => c.id);
    
    // Find messages related to these charges
    const messagesToResolve = await UrgentMessage.findAll({
      where: { 
        chargeId: { [Op.in]: paidChargeIds },
        isResolved: false
      }
    });
    
    for (const msg of messagesToResolve) {
      await msg.update({
        isRead: true,
        isResolved: true,
        body: msg.body.includes('(RESOLVED)') ? msg.body : `${msg.body} (RESOLVED)`
      });
    }
    
    console.log(`Resolved ${messagesToResolve.length} messages for paid charges`);
    
    // Also clean up any individual charge messages if the bill is fully paid
    // Get all bills
    const bills = await Bill.findAll({
      include: [{
        model: Charge,
        required: true
      }]
    });
    
    for (const bill of bills) {
      // Check if all charges for this bill are paid
      const allPaid = bill.Charges.every(c => c.status === 'paid');
      
      if (allPaid) {
        // Find messages related to this bill
        const billMessages = await UrgentMessage.findAll({
          where: { 
            billId: bill.id,
            isResolved: false
          }
        });
        
        for (const msg of billMessages) {
          await msg.update({
            isRead: true,
            isResolved: true,
            body: msg.body.includes('(RESOLVED)') ? msg.body : `${msg.body} (RESOLVED)`
          });
        }
        
        console.log(`Resolved ${billMessages.length} messages for fully paid bill ${bill.id}`);
      }
    }
  } catch (error) {
    console.error('Error removing resolved messages:', error);
    // Don't throw - this is a maintenance operation
  }
}

// Map legacy function names to new functions for backward compatibility
const generateAllUrgentMessages = refreshUrgentMessages;
const generateChargeOverdueMessages = refreshUrgentMessages;
const generateFundingMissingMessages = refreshUrgentMessages;

module.exports = {
  refreshUrgentMessages,
  generateAllUrgentMessages,  // For backward compatibility
  generateChargeOverdueMessages, // For backward compatibility
  generateFundingMissingMessages, // For backward compatibility
  findOverdueCharges,
  analyzeHouseIssues,
  removeResolvedMessages
};