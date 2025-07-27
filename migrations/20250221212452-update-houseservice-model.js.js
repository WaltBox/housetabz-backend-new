// migrations/YYYYMMDDHHMMSS-update-houseservice-model.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if columns exist before adding them
    const tableInfo = await queryInterface.describeTable('HouseServices');
    
    const columnsToAdd = [
      {
        name: 'type',
        spec: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'fixed_recurring'
        }
      },
      {
        name: 'accountNumber',
        spec: {
          type: Sequelize.STRING,
          allowNull: true
        }
      },
      {
        name: 'amount',
        spec: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Monthly amount for fixed recurring services'
        }
      },
      {
        name: 'dueDay',
        spec: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Day of month when bill is due'
        }
      },
      {
        name: 'designatedUserId',
        spec: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id'
          },
          comment: 'User responsible for entering variable bill amounts'
        }
      },
      {
        name: 'serviceRequestBundleId',
        spec: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'ServiceRequestBundles',
            key: 'id'
          },
          comment: 'Reference to the original request that created this service'
        }
      },
      {
        name: 'metadata',
        spec: {
          type: Sequelize.JSONB,
          defaultValue: {},
          comment: 'Additional service-specific details'
        }
      }
    ];

    // Only add columns that don't already exist
    for (const column of columnsToAdd) {
      if (!tableInfo[column.name]) {
        await queryInterface.addColumn('HouseServices', column.name, column.spec);
      } else {
        
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Check if columns exist before removing them
    const tableInfo = await queryInterface.describeTable('HouseServices');
    
    const columnsToRemove = [
      'metadata',
      'serviceRequestBundleId',
      'designatedUserId',
      'dueDay',
      'amount',
      'accountNumber',
      'type'
    ];

    // Only remove columns that exist
    for (const columnName of columnsToRemove) {
      if (tableInfo[columnName]) {
        await queryInterface.removeColumn('HouseServices', columnName);
      } else {
      
      }
    }
  }
};