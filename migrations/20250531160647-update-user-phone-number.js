'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, update any existing null phone numbers to empty string (if you want to handle existing users)
    // Or you could set them to a default value, or handle this manually
    await queryInterface.sequelize.query(
      `UPDATE "Users" SET "phoneNumber" = '' WHERE "phoneNumber" IS NULL;`
    );
    
    // Now change the column to be NOT NULL
    await queryInterface.changeColumn('Users', 'phoneNumber', {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Phone number cannot be empty"
        },
        is: {
          args: /^[\+]?[1-9][\d]{0,15}$/,
          msg: "Phone number must be a valid format"
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to allowing null values
    await queryInterface.changeColumn('Users', 'phoneNumber', {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        is: {
          args: /^[\+]?[1-9][\d]{0,15}$/,
          msg: "Phone number must be a valid format"
        }
      }
    });
  }
};