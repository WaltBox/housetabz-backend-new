const { HouseServiceLedger, User } = require('../models');
const { sequelize } = require('../models');

exports.getActiveLedger = async (req, res) => {
  const { houseServiceId } = req.params;
  try {
    const ledger = await HouseServiceLedger.findOne({
      where: { houseServiceId, status: 'active' },
      order: [['createdAt', 'DESC']]
    });

    if (!ledger) {
      return res.status(404).json({ error: 'No active ledger found' });
    }

    // Enhance the response with user details for each contributor
    if (ledger.metadata && ledger.metadata.fundedUsers && ledger.metadata.fundedUsers.length > 0) {
      const userIds = ledger.metadata.fundedUsers.map(user => user.userId);
      
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'username', 'email'] // Only return non-sensitive fields
      });

      // Create a map for quick lookup
      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = {
          id: user.id,
          username: user.username,
          email: user.email
        };
      });

      // Enhance the funding data with user information
      const enhancedFundedUsers = ledger.metadata.fundedUsers.map(fundedUser => {
        const userData = userMap[fundedUser.userId] || { 
          id: fundedUser.userId,
          username: 'Unknown User',
          email: null
        };
        
        return {
          ...fundedUser,
          user: userData
        };
      });

      // Create a new response object with enhanced data
      const enhancedLedger = {
        ...ledger.toJSON(),
        metadata: {
          ...ledger.metadata,
          fundedUsers: enhancedFundedUsers
        }
      };

      return res.json(enhancedLedger);
    }

    res.json(ledger);
  } catch (error) {
    console.error('Error fetching active ledger:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAllLedgersForHouseService = async (req, res) => {
  const { houseServiceId } = req.params;
  try {
    const ledgers = await HouseServiceLedger.findAll({
      where: { houseServiceId },
      order: [['createdAt', 'DESC']]
    });

    // Enhance all ledgers with user details for contributors
    const enhancedLedgers = await Promise.all(ledgers.map(async (ledger) => {
      if (ledger.metadata && ledger.metadata.fundedUsers && ledger.metadata.fundedUsers.length > 0) {
        const userIds = ledger.metadata.fundedUsers.map(user => user.userId);
        
        const users = await User.findAll({
          where: { id: userIds },
          attributes: ['id', 'username', 'email'] // Only return non-sensitive fields
        });

        // Create a map for quick lookup
        const userMap = {};
        users.forEach(user => {
          userMap[user.id] = {
            id: user.id,
            username: user.username,
            email: user.email
          };
        });

        // Enhance the funding data with user information
        const enhancedFundedUsers = ledger.metadata.fundedUsers.map(fundedUser => {
          const userData = userMap[fundedUser.userId] || { 
            id: fundedUser.userId,
            username: 'Unknown User',
            email: null
          };
          
          return {
            ...fundedUser,
            user: userData
          };
        });

        // Create a new object with enhanced data
        return {
          ...ledger.toJSON(),
          metadata: {
            ...ledger.metadata,
            fundedUsers: enhancedFundedUsers
          }
        };
      }
      return ledger.toJSON();
    }));

    res.json({ ledgers: enhancedLedgers });
  } catch (error) {
    console.error('Error fetching ledgers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add new endpoints 

/**
 * Get funding details for a specific ledger
 */
exports.getFundingDetails = async (req, res) => {
  const { ledgerId } = req.params;
  try {
    const ledger = await HouseServiceLedger.findByPk(ledgerId);

    if (!ledger) {
      return res.status(404).json({ error: 'Ledger not found' });
    }

    // Extract and enhance funding information
    let fundingDetails = {
      ledgerId: ledger.id,
      houseServiceId: ledger.houseServiceId,
      fundingRequired: ledger.fundingRequired,
      funded: ledger.funded,
      remainingAmount: Math.max(0, ledger.fundingRequired - ledger.funded),
      percentFunded: ledger.fundingRequired > 0 
        ? Math.min(100, Math.round((ledger.funded / ledger.fundingRequired) * 100)) 
        : 0,
      status: ledger.status,
      contributors: []
    };

    // Add contributor details
    if (ledger.metadata && ledger.metadata.fundedUsers && ledger.metadata.fundedUsers.length > 0) {
      const userIds = ledger.metadata.fundedUsers.map(user => user.userId);
      
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'username', 'email']
      });

      // Create a map for quick lookup
      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user;
      });

      // Build enhanced contributors list
      fundingDetails.contributors = ledger.metadata.fundedUsers.map(fundedUser => {
        const user = userMap[fundedUser.userId];
        return {
          userId: fundedUser.userId,
          username: user ? user.username : 'Unknown User',
          amount: fundedUser.amount,
          percentOfTotal: ledger.fundingRequired > 0 
            ? Math.round((fundedUser.amount / ledger.fundingRequired) * 100) 
            : 0,
          timestamp: fundedUser.timestamp,
          lastUpdated: fundedUser.lastUpdated,
          charges: fundedUser.charges || []
        };
      });
    }

    res.json(fundingDetails);
  } catch (error) {
    console.error('Error fetching funding details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get funding summary for all users for a house service
 */
exports.getFundingSummary = async (req, res) => {
  const { houseServiceId } = req.params;
  try {
    // Get all ledgers for the house service
    const ledgers = await HouseServiceLedger.findAll({
      where: { houseServiceId },
      order: [['createdAt', 'DESC']]
    });

    if (ledgers.length === 0) {
      return res.json({
        houseServiceId,
        totalFundingRequired: 0,
        totalFunded: 0,
        ledgerCount: 0,
        activeLedger: null,
        userContributions: []
      });
    }

    // Collect all user IDs who have contributed across all ledgers
    const allUserIds = new Set();
    const userContributionsMap = {};

    ledgers.forEach(ledger => {
      if (ledger.metadata && ledger.metadata.fundedUsers) {
        ledger.metadata.fundedUsers.forEach(fundedUser => {
          const userId = fundedUser.userId;
          allUserIds.add(userId);
          
          if (!userContributionsMap[userId]) {
            userContributionsMap[userId] = {
              userId,
              totalContribution: 0,
              contributionCount: 0,
              lastContribution: null
            };
          }
          
          userContributionsMap[userId].totalContribution += Number(fundedUser.amount);
          userContributionsMap[userId].contributionCount++;
          
          // Track the most recent contribution
          const contributionDate = fundedUser.lastUpdated || fundedUser.timestamp;
          if (contributionDate && (!userContributionsMap[userId].lastContribution || 
              new Date(contributionDate) > new Date(userContributionsMap[userId].lastContribution))) {
            userContributionsMap[userId].lastContribution = contributionDate;
          }
        });
      }
    });

    // Get user details for all contributors
    const userIds = Array.from(allUserIds);
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'username', 'email']
    });

    // Create a map for quick lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });

    // Enhance contributor data with user information
    const userContributions = Object.values(userContributionsMap).map(contribution => {
      const user = userMap[contribution.userId];
      return {
        ...contribution,
        username: user ? user.username : 'Unknown User',
        email: user ? user.email : null
      };
    });

    // Find the active ledger
    const activeLedger = ledgers.find(ledger => ledger.status === 'active');

    // Calculate totals
    const totalFundingRequired = ledgers.reduce((sum, ledger) => sum + Number(ledger.fundingRequired), 0);
    const totalFunded = ledgers.reduce((sum, ledger) => sum + Number(ledger.funded), 0);

    res.json({
      houseServiceId,
      totalFundingRequired,
      totalFunded,
      percentFunded: totalFundingRequired > 0 
        ? Math.min(100, Math.round((totalFunded / totalFundingRequired) * 100)) 
        : 0,
      ledgerCount: ledgers.length,
      activeLedger: activeLedger ? {
        id: activeLedger.id,
        fundingRequired: activeLedger.fundingRequired,
        funded: activeLedger.funded,
        remainingAmount: Math.max(0, activeLedger.fundingRequired - activeLedger.funded),
        percentFunded: activeLedger.fundingRequired > 0 
          ? Math.min(100, Math.round((activeLedger.funded / activeLedger.fundingRequired) * 100)) 
          : 0
      } : null,
      userContributions: userContributions.sort((a, b) => b.totalContribution - a.totalContribution)
    });
  } catch (error) {
    console.error('Error fetching funding summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};