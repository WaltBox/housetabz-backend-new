// src/services/urgentMessageService.js - FIXED VERSION
const { Op } = require('sequelize');
const { Charge, Bill, House, User, UrgentMessage, sequelize } = require('../models');

// Message type constants
const MESSAGE_TYPES = {
  USER_MULTI_FUNDING: 'user_multi_funding',
  CHARGE_FUNDING: 'charge_funding',
  HOUSE_MULTI_ROOMMATE_FUNDING: 'house_multi_roommate_funding',
  BILL_MULTI_FUNDING: 'bill_multi_funding',
  ROOMMATE_MULTI_FUNDING: 'roommate_multi_funding',
  SINGLE_FUNDING: 'single_funding'
};

const ROOMMATE_MESSAGE_TYPES = [
  MESSAGE_TYPES.HOUSE_MULTI_ROOMMATE_FUNDING,
  MESSAGE_TYPES.BILL_MULTI_FUNDING,
  MESSAGE_TYPES.ROOMMATE_MULTI_FUNDING,
  MESSAGE_TYPES.SINGLE_FUNDING
];

const USER_MESSAGE_TYPES = [
  MESSAGE_TYPES.USER_MULTI_FUNDING,
  MESSAGE_TYPES.CHARGE_FUNDING
];

// Main function to generate and manage all urgent messages
async function refreshUrgentMessages() {
  await sequelize.transaction(async trx => {
    console.log('Starting urgent message refresh...');
    
    // 1. Get current data - all unpaid charges
    const overdueCharges = await findOverdueCharges();
    
    // 2. Analyze data to determine house/bill/user status
    const housesWithIssues = await analyzeHouseIssues(overdueCharges);
    
    // 3. For each house, refresh all messages to match current state
    for (const house of housesWithIssues) {
      await refreshMessagesForHouse(house);
    }
    
    // 4. Clean up any resolved messages (scenario-based, not charge-based)
    await removeActuallyResolvedMessages();
    
    console.log('Urgent message refresh completed');
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
  console.log(`Refreshing messages for house ${house.id}`);
  
  // Get all current messages for this house to track what needs updating/removing
  const currentMessages = await UrgentMessage.findAll({
    where: { houseId: house.id, isResolved: false }
  });
  
  // Process all users in the house
  const allUsers = Object.values(house.users);
  const billsWithIssues = Object.values(house.bills);
  
  // Process each user's messages
  for (const user of allUsers) {
    await processUserMessages(user, house, billsWithIssues, currentMessages);
  }
  
  // Check if any existing messages should now be resolved
  await checkAndResolveOutdatedMessages(currentMessages, house);
}

// Process all messages for a single user (both own charges and roommate notifications)
async function processUserMessages(user, house, billsWithIssues, currentMessages) {
  // 1. Handle user's own unpaid charges
  await processUserOwnCharges(user, house, billsWithIssues, currentMessages);
  
  // 2. Handle messages about roommates' unpaid charges
  const usersWithIssues = Object.values(house.users).filter(u => u.unpaidCharges.length > 0);
  await processUserRoommateNotifications(user, house, usersWithIssues, currentMessages);
}

// Process a user's own unpaid charges
async function processUserOwnCharges(user, house, billsWithIssues, currentMessages) {
  if (user.unpaidCharges.length === 0) {
    // User has no unpaid charges - resolve any existing user messages
    const existingUserMsg = findExistingUserMessage(currentMessages, user.id);
    if (existingUserMsg && !existingUserMsg.isResolved) {
      await resolveMessage(existingUserMsg, 'User has no more unpaid charges');
    }
    return;
  }
  
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
  
  const billIds = Object.keys(chargesByBill);
  const existingUserMsg = findExistingUserMessage(currentMessages, user.id);
  
  if (billIds.length > 1) {
    // User has multiple unpaid bills - need user_multi_funding message
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
    
    const messageData = {
      userId: user.id,
      houseId: house.id,
      billId: parseInt(billIds[0]),
      chargeId: chargesByBill[billIds[0]][0].id,
      type: MESSAGE_TYPES.USER_MULTI_FUNDING,
      title: 'Funding Required',
      body: `You have ${billIds.length} services missing your funding totaling $${totalUserOwed.toFixed(2)}`,
      metadata: JSON.stringify(metadata),
      isResolved: false
    };
    
    await evolveOrCreateUserMessage(existingUserMsg, messageData);
    
  } else if (billIds.length === 1) {
    // User has a single bill with unpaid charges - need charge_funding message
    const billId = billIds[0];
    const bill = house.bills[billId];
    const charges = chargesByBill[billId];
    const totalAmount = charges.reduce((sum, c) => sum + parseFloat(c.baseAmount), 0);
    
    const metadata = {
      version: new Date().toISOString(),
      billName: bill ? bill.name : 'Unknown Service',
      amount: totalAmount,
      dueDate: bill ? bill.dueDate : null
    };
    
    const messageData = {
      userId: user.id,
      houseId: house.id,
      billId: parseInt(billId),
      chargeId: charges[0].id,
      type: MESSAGE_TYPES.CHARGE_FUNDING,
      title: 'Funding Overdue',
      body: `Your funding for ${bill ? bill.name : 'a service'} ($${totalAmount.toFixed(2)}) is overdue`,
      metadata: JSON.stringify(metadata),
      isResolved: false
    };
    
    await evolveOrCreateUserMessage(existingUserMsg, messageData);
  }
}

// Process notifications about roommates' unpaid charges
async function processUserRoommateNotifications(user, house, usersWithIssues, currentMessages) {
  // Filter out the current user to get only roommates with issues
  const roommatesWithIssues = usersWithIssues.filter(u => u.id !== user.id);
  
  const existingRoommateMsg = findExistingRoommateMessage(currentMessages, user.id);
  
  if (roommatesWithIssues.length === 0) {
    // No roommates with issues - resolve any existing roommate notification
    if (existingRoommateMsg && !existingRoommateMsg.isResolved) {
      await resolveMessage(existingRoommateMsg, 'No roommates have unpaid charges');
    }
    return;
  }
  
  // Get all bills with roommate issues
  const roommatesBillIds = new Set();
  for (const roommate of roommatesWithIssues) {
    for (const charge of roommate.unpaidCharges) {
      roommatesBillIds.add(charge.billId);
    }
  }
  
  // Determine what type of roommate message is needed
  let messageData;
  
  if (roommatesWithIssues.length > 1 && roommatesBillIds.size > 1) {
    // Multiple roommates with multiple bills - house_multi_roommate_funding
    messageData = createHouseMultiRoommateMessage(user, house, roommatesWithIssues, roommatesBillIds);
  } else if (roommatesWithIssues.length > 1 && roommatesBillIds.size === 1) {
    // Multiple roommates with one bill - bill_multi_funding
    messageData = createBillMultiFundingMessage(user, house, roommatesWithIssues, [...roommatesBillIds][0]);
  } else if (roommatesWithIssues.length === 1 && roommatesBillIds.size > 1) {
    // One roommate with multiple bills - roommate_multi_funding
    messageData = createRoommateMultiFundingMessage(user, house, roommatesWithIssues[0], roommatesBillIds);
  } else if (roommatesWithIssues.length === 1 && roommatesBillIds.size === 1) {
    // One roommate with one bill - single_funding
    messageData = createSingleFundingMessage(user, house, roommatesWithIssues[0], [...roommatesBillIds][0]);
  }
  
  if (messageData) {
    await evolveOrCreateRoommateMessage(existingRoommateMsg, messageData);
  }
}

// Helper functions for creating specific message types
function createHouseMultiRoommateMessage(user, house, roommatesWithIssues, roommatesBillIds) {
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
  
  return {
    userId: user.id,
    houseId: house.id,
    billId: parseInt([...roommatesBillIds][0]),
    chargeId: roommatesWithIssues[0].unpaidCharges[0].id,
    type: MESSAGE_TYPES.HOUSE_MULTI_ROOMMATE_FUNDING,
    title: 'House Funding Alert',
    body: `${roommatesWithIssues.length} roommates are missing funding for ${roommatesBillIds.size} services`,
    metadata: JSON.stringify(metadata),
    isResolved: false
  };
}

function createBillMultiFundingMessage(user, house, roommatesWithIssues, billId) {
  const bill = house.bills[billId];
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
  
  return {
    userId: user.id,
    houseId: house.id,
    billId: parseInt(billId),
    chargeId: roommatesWithIssues[0].unpaidCharges.find(c => c.billId === billId).id,
    type: MESSAGE_TYPES.BILL_MULTI_FUNDING,
    title: 'Service Funding Alert',
    body: `${bill ? bill.name : 'A service'} is missing funding from ${roommatesWithIssues.length} roommates`,
    metadata: JSON.stringify(metadata),
    isResolved: false
  };
}

function createRoommateMultiFundingMessage(user, house, roommate, roommatesBillIds) {
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
  
  return {
    userId: user.id,
    houseId: house.id,
    billId: parseInt([...roommatesBillIds][0]),
    chargeId: roommate.unpaidCharges[0].id,
    type: MESSAGE_TYPES.ROOMMATE_MULTI_FUNDING,
    title: 'Roommate Funding Alert',
    body: `${roommate.username} is missing funding for ${roommatesBillIds.size} services totaling $${totalOwed.toFixed(2)}`,
    metadata: JSON.stringify(metadata),
    isResolved: false
  };
}

function createSingleFundingMessage(user, house, roommate, billId) {
  const bill = house.bills[billId];
  const charges = roommate.unpaidCharges.filter(c => c.billId === billId);
  const amount = charges.reduce((sum, c) => sum + parseFloat(c.baseAmount), 0);
  
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
  
  return {
    userId: user.id,
    houseId: house.id,
    billId: parseInt(billId),
    chargeId: charges[0].id,
    type: MESSAGE_TYPES.SINGLE_FUNDING,
    title: 'Service Funding Alert',
    body: `${bill ? bill.name : 'A service'} is missing funding from ${roommate.username} ($${amount.toFixed(2)})`,
    metadata: JSON.stringify(metadata),
    isResolved: false
  };
}

// Helper functions for finding existing messages
function findExistingUserMessage(currentMessages, userId) {
  return currentMessages.find(m => 
    m.userId === userId && USER_MESSAGE_TYPES.includes(m.type) && !m.isResolved
  );
}

function findExistingRoommateMessage(currentMessages, userId) {
  return currentMessages.find(m => 
    m.userId === userId && ROOMMATE_MESSAGE_TYPES.includes(m.type) && !m.isResolved
  );
}

// Message evolution functions
async function evolveOrCreateUserMessage(existingMessage, newMessageData) {
  if (existingMessage) {
    await evolveMessage(existingMessage, newMessageData);
  } else {
    await createMessage(newMessageData);
  }
}

async function evolveOrCreateRoommateMessage(existingMessage, newMessageData) {
  if (existingMessage) {
    await evolveMessage(existingMessage, newMessageData);
  } else {
    await createMessage(newMessageData);
  }
}

async function evolveMessage(existingMessage, newMessageData) {
  const needsUpdate = 
    existingMessage.type !== newMessageData.type ||
    existingMessage.title !== newMessageData.title ||
    existingMessage.body !== newMessageData.body ||
    existingMessage.metadata !== newMessageData.metadata;
  
  if (needsUpdate) {
    const wasTypeChange = existingMessage.type !== newMessageData.type;
    
    await existingMessage.update({
      type: newMessageData.type,
      title: newMessageData.title,
      body: newMessageData.body,
      metadata: newMessageData.metadata,
      billId: newMessageData.billId,
      chargeId: newMessageData.chargeId,
      isRead: false, // Mark as unread since it changed
      isResolved: false
    });
    
    if (wasTypeChange) {
      console.log(`Message ${existingMessage.id} transitioned from ${existingMessage.type} to ${newMessageData.type}`);
    } else {
      console.log(`Message ${existingMessage.id} updated with new content`);
    }
  } else {
    console.log(`Message ${existingMessage.id} - no changes needed`);
  }
}

async function createMessage(messageData) {
  try {
    const message = await UrgentMessage.create(messageData);
    console.log(`Created new ${messageData.type} message (ID: ${message.id}) for user ${messageData.userId}`);
    return message;
  } catch (error) {
    console.error(`Error creating message for user ${messageData.userId}:`, error);
    return null;
  }
}

async function resolveMessage(message, reason) {
  await message.update({
    isRead: true,
    isResolved: true,
    body: message.body.includes('(RESOLVED)') ? message.body : `${message.body} (RESOLVED)`
  });
  console.log(`Resolved message ${message.id} (${message.type}): ${reason}`);
}

// Check if any existing messages should now be resolved based on current house state
async function checkAndResolveOutdatedMessages(currentMessages, house) {
  const usersWithIssues = Object.values(house.users).filter(u => u.unpaidCharges.length > 0);
  const roommatesWithMultipleBills = usersWithIssues.filter(u => 
    new Set(u.unpaidCharges.map(c => c.billId)).size > 1
  );
  
  for (const message of currentMessages) {
    if (message.isResolved) continue;
    
    let shouldResolve = false;
    let reason = '';
    
    try {
      const metadata = JSON.parse(message.metadata || '{}');
      
      switch (message.type) {
        case MESSAGE_TYPES.HOUSE_MULTI_ROOMMATE_FUNDING:
          // Should resolve if we don't have multiple roommates with multiple bills anymore
          shouldResolve = roommatesWithMultipleBills.length <= 1;
          reason = 'No longer multiple roommates with multiple bills';
          break;
          
        case MESSAGE_TYPES.BILL_MULTI_FUNDING:
          // Should resolve if the specific bill is fully paid
          const bill = house.bills[message.billId];
          shouldResolve = !bill || bill.unpaidCharges.length === 0;
          reason = `Bill ${message.billId} is fully paid`;
          break;
          
        case MESSAGE_TYPES.ROOMMATE_MULTI_FUNDING:
          // Should resolve if the specific roommate no longer has multiple bills
          const roommateId = metadata.roommateId;
          const roommate = house.users[roommateId];
          if (roommate) {
            const roommateBillCount = new Set(roommate.unpaidCharges.map(c => c.billId)).size;
            shouldResolve = roommateBillCount <= 1;
            reason = `Roommate ${roommateId} no longer has multiple unpaid bills`;
          } else {
            shouldResolve = true;
            reason = `Roommate ${roommateId} no longer in house`;
          }
          break;
          
        case MESSAGE_TYPES.SINGLE_FUNDING:
          // Should resolve if the bill is fully paid or the roommate has no issues
          const unpaidUser = metadata.unpaidUser;
          if (unpaidUser) {
            const roommateWithIssues = house.users[unpaidUser.id];
            shouldResolve = !roommateWithIssues || roommateWithIssues.unpaidCharges.length === 0;
            reason = `Roommate ${unpaidUser.id} has no more unpaid charges`;
          }
          break;
      }
      
      if (shouldResolve) {
        await resolveMessage(message, reason);
      }
    } catch (error) {
      console.error(`Error checking if message ${message.id} should be resolved:`, error);
    }
  }
}

// Remove messages that are actually resolved (scenario-based, not charge-based)
async function removeActuallyResolvedMessages() {
  try {
    console.log('Checking for messages that should be resolved due to scenario completion...');
    
    // Get all houses with their current state
    const houses = await House.findAll({
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'username', 'email']
        }
      ]
    });
    
    // For each house, get unpaid charges separately to avoid association issues
    for (const house of houses) {
      // Get unpaid charges for users in this house
      const userIds = house.users.map(u => u.id);
      const unpaidCharges = await Charge.findAll({
        where: {
          userId: { [Op.in]: userIds },
          status: { [Op.ne]: 'paid' }
        },
        include: [
          { model: Bill, attributes: ['id', 'name', 'houseId'] }
        ]
      });
      
      // Build house data structure
      const houseData = {
        id: house.id,
        users: {},
        bills: {}
      };
      
      // Initialize users
      for (const user of house.users) {
        houseData.users[user.id] = {
          id: user.id,
          username: user.username,
          unpaidCharges: []
        };
      }
      
      // Add unpaid charges to users
      for (const charge of unpaidCharges) {
        if (houseData.users[charge.userId]) {
          houseData.users[charge.userId].unpaidCharges.push(charge);
        }
      }
      
      // Check current messages for this house
      const currentMessages = await UrgentMessage.findAll({
        where: { houseId: house.id, isResolved: false }
      });
      
      if (currentMessages.length > 0) {
        await checkAndResolveOutdatedMessages(currentMessages, houseData);
      }
    }

    
    console.log('Scenario-based message resolution check completed');
  } catch (error) {
    console.error('Error in scenario-based message resolution:', error);
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
  removeActuallyResolvedMessages,
  MESSAGE_TYPES
};