const { DataTypes } = require('sequelize');
const axios = require('axios');

module.exports = (sequelize) => {
  const RhythmOfferRequest = sequelize.define(
    'RhythmOfferRequest',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
      },
      service_request_bundle_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'ServiceRequestBundles', // Table name
          key: 'id',
        },
      },
      roommate_accepted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      house_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      service_start_date: DataTypes.DATE,
      enrollment_type: {
        type: DataTypes.ENUM('MOVE_IN', 'SWITCH'),
        allowNull: false,
        defaultValue: 'MOVE_IN',
      },
      meter_id: DataTypes.STRING,
    },
    {
      tableName: 'rhythm_offer_requests',
      timestamps: true,
    }
  );

  // Hook to trigger customer validation
  RhythmOfferRequest.afterUpdate(async (request, options) => {
    console.log(`afterUpdate hook triggered for RhythmOfferRequest: ${request.id}`);

    if (request.roommate_accepted === true) {
      try {
        const customerData = await prepareCustomerData(request, sequelize.models);

        const response = await axios.post(
          'http://localhost:3000/api/v2/customer-validations/',
          customerData
        );

        const validationResponse = response.data;

        // Save the customer validation in the database
        await sequelize.models.CustomerValidation.create({
          uuid: validationResponse.uuid,
          deposit_amount: validationResponse.deposit_amount,
          first_name: validationResponse.first_name,
          last_name: validationResponse.last_name,
          email: validationResponse.email,
          phone: validationResponse.phone,
          address_line: validationResponse.address_line,
          secondary_line: validationResponse.secondary_line,
          city: validationResponse.city,
          state: validationResponse.state,
          zip_code: validationResponse.zip_code,
          acquisition_medium: validationResponse.acquisition_medium,
          acquisition_campaign: validationResponse.acquisition_campaign,
        });

        console.log('Customer validation saved successfully.');
      } catch (error) {
        console.error('Error creating customer validation:', error);
        throw error;
      }
    }
  });

  return RhythmOfferRequest;
};

// Helper function to prepare customer data
async function prepareCustomerData(request, models) {
  try {
    const user = await models.User.findByPk(request.user_id);
    const house = await models.House.findByPk(request.house_id);

    if (!user || !house) {
      throw new Error('User or House not found');
    }

    return {
      first_name: 'HouseTabz',
      last_name: 'HouseTabz',
      email: 'house_name@housetabz.com',
      phone: 'House Phone',
      address_line: house.address_line,
      secondary_line: house.secondary_line || '',
      city: house.city,
      state: house.state,
      zip_code: house.zip_code,
      offer_snapshot: request.uuid,
      acquisition_medium: 'Online',
      acquisition_campaign: 'Campaign Name',
      rhythm_campaign_slug: 'campaign-slug',
      credit_score: 700,
    };
  } catch (error) {
    console.error('Error preparing customer data:', error);
    throw error;
  }
}
