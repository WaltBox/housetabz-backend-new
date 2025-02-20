// src/services/StripeHouseService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { StripeHouseCustomer, House, User, VirtualCardRequest, ServiceRequestBundle } = require('../models');

class StripeHouseService {
  async getOrCreateHouseCustomer(houseId) {
    try {
      // Check if house customer already exists
      let houseCustomer = await StripeHouseCustomer.findOne({
        where: { houseId },
        include: [{ model: House, as: 'house' }]
      });

      if (houseCustomer) {
        return houseCustomer;
      }

      // If not, create new house customer
      const house = await House.findByPk(houseId, {
        include: [{
          model: User,
          as: 'users',
          limit: 1,
          order: [['createdAt', 'ASC']] // Get the oldest user (likely house creator)
        }]
      });

      if (!house) {
        throw new Error('House not found');
      }

      // Create Stripe customer for the house
      const customer = await stripe.customers.create({
        name: `House ${house.id}`,
        email: house.users[0].email, // Use first user's email
        metadata: {
          houseId: house.id,
          type: 'house_account'
        }
      });

      // Create cardholder for the house
     // Create cardholder for the house
     const cardholder = await stripe.issuing.cardholders.create({
      type: 'individual',  // Let's try individual instead of company since it's simpler
      name: 'HouseTabz Account',
      email: house.users[0].email,
      phone_number: '+15125551234',
      billing: {
        address: {
          line1: house.address_line,
          city: house.city,
          state: house.state,
          postal_code: house.zip_code,
          country: 'US'
        }
      }
    });
      

      // Save house customer record
      houseCustomer = await StripeHouseCustomer.create({
        houseId: house.id,
        stripeCustomerId: customer.id,
        stripeCardholderId: cardholder.id,
        status: 'active'
      });

      return houseCustomer;
    } catch (error) {
      console.error('Error in getOrCreateHouseCustomer:', error);
      throw error;
    }
  }

  async createVirtualCard(virtualCardRequestId, metadata = {}) {
    try {
      const virtualCardRequest = await VirtualCardRequest.findByPk(virtualCardRequestId, {
        include: [{
          model: ServiceRequestBundle,
          as: 'serviceRequestBundle'
        }]
      });
  
      if (!virtualCardRequest) {
        throw new Error('Virtual card request not found');
      }
  
      const bundle = virtualCardRequest.serviceRequestBundle;
      
      // Get or create house customer
      const houseCustomer = await this.getOrCreateHouseCustomer(bundle.houseId);
  
      // Create a card in Stripe
      const stripeCard = await stripe.issuing.cards.create({
        type: 'virtual',
        currency: 'usd',
        status: 'active',
        cardholder: houseCustomer.stripeCardholderId,
        spending_controls: {
          spending_limits: [{
            amount: Math.round(virtualCardRequest.monthlyAmount * 100),
            interval: 'monthly'
          }],
          allowed_categories: ['utilities']
        },
        metadata: {
          virtualCardRequestId: virtualCardRequest.id,
          serviceRequestBundleId: bundle.id,
          houseId: bundle.houseId,
          serviceName: virtualCardRequest.serviceName,
          ...metadata
        }
      });
  
      // Create record in our VirtualCards table
      const virtualCard = await sequelize.models.VirtualCard.create({
        stripeCardId: stripeCard.id,
        virtualCardRequestId: virtualCardRequest.id,
        houseId: bundle.houseId,
        last4: stripeCard.last4,
        expMonth: stripeCard.exp_month,
        expYear: stripeCard.exp_year,
        status: 'active',
        monthlyLimit: virtualCardRequest.monthlyAmount
      });
  
      // Update virtual card request with the card ID
      await virtualCardRequest.update({
        virtualCardId: stripeCard.id,
        status: 'active'
      });
  
      return {
        stripeCard,
        virtualCard
      };
    } catch (error) {
      console.error('Error creating virtual card:', error);
      throw error;
    }
  }

  async getVirtualCard(virtualCardId) {
    try {
      const card = await stripe.issuing.cards.retrieve(virtualCardId);
      return card;
    } catch (error) {
      console.error('Error retrieving virtual card:', error);
      throw error;
    }
  }

  async updateVirtualCardSpendingLimit(virtualCardId, monthlyAmount) {
    try {
      const card = await stripe.issuing.cards.update(virtualCardId, {
        spending_controls: {
          spending_limits: [{
            amount: Math.round(monthlyAmount * 100),
            interval: 'monthly'
          }]
        }
      });
      return card;
    } catch (error) {
      console.error('Error updating virtual card spending limit:', error);
      throw error;
    }
  }

  async cancelVirtualCard(virtualCardId) {
    try {
      const card = await stripe.issuing.cards.update(virtualCardId, {
        status: 'canceled'
      });
      return card;
    } catch (error) {
      console.error('Error canceling virtual card:', error);
      throw error;
    }
  }

  async getHouseCustomer(houseId) {
    try {
      const houseCustomer = await StripeHouseCustomer.findOne({
        where: { houseId },
        include: [{ model: House, as: 'house' }]
      });

      if (!houseCustomer) {
        throw new Error('House customer not found');
      }

      return houseCustomer;
    } catch (error) {
      console.error('Error getting house customer:', error);
      throw error;
    }
  }
}

// Create an instance and export it
const stripeHouseService = new StripeHouseService();
module.exports = stripeHouseService;