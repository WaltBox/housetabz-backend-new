// models/rhythmOfferRequest.js
const { DataTypes } = require('sequelize');
const axios = require('axios');

module.exports = (sequelize) => {
  const RhythmOfferRequest = sequelize.define(
    'RhythmOfferRequest',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, unique: true },
      service_request_bundle_id: { type: DataTypes.INTEGER, allowNull: false },
      roommate_accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
      house_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      service_start_date: DataTypes.DATE,
      enrollment_type: {
        type: DataTypes.ENUM('MOVE_IN', 'SWITCH'),
        allowNull: false,
        defaultValue: 'MOVE_IN',
      },
      meter_id: DataTypes.STRING,
      customer_validated: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: 'rhythm_offer_requests',
      timestamps: true,
    }
  );

  // Set up associations
  RhythmOfferRequest.associate = (models) => {
    RhythmOfferRequest.hasOne(models.CustomerValidation, {
      foreignKey: 'rhythm_offer_request_id',
      as: 'customerValidation',
    });
    RhythmOfferRequest.belongsTo(models.House, { foreignKey: 'house_id' });
    RhythmOfferRequest.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  // AfterUpdate hook to handle customer validation and premise creation
  RhythmOfferRequest.afterUpdate(async (request, options) => {
    const { CustomerValidation, HouseService } = sequelize.models;

    // Check if roommate has accepted and customer validation has not been done yet
    if (request.roommate_accepted && !request.customer_validated) {
      console.log(`afterUpdate hook triggered for RhythmOfferRequest: ${request.id}`);

      try {
        // Check for existing CustomerValidation
        const existingValidation = await CustomerValidation.findOne({
          where: { rhythm_offer_request_id: request.id },
        });

        // Create CustomerValidation if not already exists
        if (!existingValidation) {
          const customerData = await prepareCustomerData(request, sequelize);
          console.log('Sending customer validation request:', customerData);

          const response = await axios.post(
            'http://localhost:3000/api/v2/customer-validations/',
            customerData
          );

          const validationResponse = response.data;
          console.log('Customer validation response:', validationResponse);

          // Create new CustomerValidation entry in the database
          await CustomerValidation.create({
            uuid: validationResponse.uuid,
            deposit_amount: validationResponse.deposit_amount,
            first_name: 'housetabz,inc',
            last_name: 'housetabz,inc',
            email: 'housetabz@example.com',
            phone: '888222333',
            address_line: validationResponse.address_line,
            secondary_line: validationResponse.secondary_line,
            city: validationResponse.city,
            state: validationResponse.state,
            zip_code: validationResponse.zip_code,
            acquisition_medium: validationResponse.acquisition_medium,
            acquisition_campaign: validationResponse.acquisition_campaign,
            rhythm_offer_request_id: request.id,
          });

          console.log('Customer validation created.');
        }

        // Update request as customer validated
        request.customer_validated = true;
        await request.save();

        // Retrieve CustomerValidation and proceed with premise creation
        const customerValidation = await CustomerValidation.findOne({
          where: { rhythm_offer_request_id: request.id },
        });

        if (customerValidation) {
          console.log('Making premises request...');
          await makePremisesRequest(request, customerValidation, sequelize);
        } else {
          console.error('Customer validation not found for premises creation.');
        }
      } catch (error) {
        console.error('Error during customer validation or premises request:', error);
        throw error;
      }
    }
  });

  return RhythmOfferRequest;
};

// Helper function to create a premise and associated house service
async function makePremisesRequest(rhythmOfferRequest, customerValidation, sequelize) {
  const { House, HouseService } = sequelize.models;

  try {
    const house = await House.findByPk(rhythmOfferRequest.house_id);
    if (!house) throw new Error('House not found');

    const premisesPayload = {
      enrollment_type: rhythmOfferRequest.enrollment_type,
      meter_id: rhythmOfferRequest.meter_id,
      offer_snapshot: rhythmOfferRequest.uuid,
      service_start_date: null,
      customer_validation: customerValidation.uuid,
      status: 'PENDING',
      mailing_address: {
        address_line: house.address_line,
        secondary_line: house.secondary_line || '',
        city: house.city,
        state: house.state,
        zip_code: house.zip_code,
      },
      payment_method_id: null,
    };

    console.log('Sending premises request payload:', premisesPayload);

    const response = await axios.post('http://localhost:3000/api/v2/premises/', premisesPayload);
    console.log('Premises request response received:', response.data);

    if (response.data && response.data.premise) {
      console.log('Creating HouseService for RhythmOfferRequest');

      // Create a HouseService entry after the premise is created
      await HouseService.create({
        name: 'Rhythm Energy',
        status: response.data.premise.status,
        type: 'energy',
        houseId: rhythmOfferRequest.house_id,
        association_id: rhythmOfferRequest.id,
        association_type: 'RhythmOfferRequest',
      });
      console.log('HouseService created successfully');
    } else {
      console.error('Premises request did not return expected status. HouseService not created.');
    }
  } catch (error) {
    console.error('Error making premises request or creating HouseService:', error);
    throw error;
  }
}

// Helper function to prepare customer data for validation request
async function prepareCustomerData(request, sequelize) {
  const { User, House } = sequelize.models;

  try {
    const user = await User.findByPk(request.user_id);
    const house = await House.findByPk(request.house_id);

    if (!user || !house) throw new Error('User or House not found');

    return {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone || 'House Phone',
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
