// migrations/YYYYMMDDHHMMSS-migrate-financial-data.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    
    // Get all users and their balances
    const users = await sequelize.query(
      'SELECT id, balance, points, credit FROM "Users"',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    // Create UserFinance records for each user
    if (users.length > 0) {
      const userFinances = users.map(user => ({
        userId: user.id,
        balance: user.balance || 0.00,
        credit: user.credit || 0.00,
        points: user.points || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await queryInterface.bulkInsert('UserFinances', userFinances);
    }
    
    // Get all houses and their balances
    const houses = await sequelize.query(
      'SELECT id, balance, ledger FROM "Houses"',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    // Create HouseFinance records for each house
    if (houses.length > 0) {
      const houseFinances = houses.map(house => ({
        houseId: house.id,
        balance: house.balance || 0.00,
        ledger: house.ledger || 0.00,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await queryInterface.bulkInsert('HouseFinances', houseFinances);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // In case of rollback, we'll leave the data in the original tables
    // Just clear the new tables
    await queryInterface.bulkDelete('UserFinances', null, {});
    await queryInterface.bulkDelete('HouseFinances', null, {});
  }
};