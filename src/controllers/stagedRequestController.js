const { StagedRequest, ServiceRequestBundle, User, Task, Partner } = require('../models');
const Sequelize = require('sequelize');

const stagedRequestController = {
  async createStagedRequest(req, res) {
    try {
      const { transactionId, serviceName, pricing, userId } = req.body;
      const { partnerId } = req.params;

      // Validate input
      if (!transactionId || !serviceName || !pricing || !userId || !partnerId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Fetch the partner
      const partner = await Partner.findByPk(partnerId);
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      // Fetch user and their houseId
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create the StagedRequest with partnerId
      const stagedRequest = await StagedRequest.create({
        partnerName: partner.name,
        partnerId: partner.id, // Add this line
        transactionId,
        serviceName,
        pricing,
      });

      // Create the ServiceRequestBundle
      const serviceRequestBundle = await ServiceRequestBundle.create({
        houseId: user.houseId,
        userId,
        stagedRequestId: stagedRequest.id,
        status: 'pending',
      });

      // Fetch all roommates except the creator
      const roommates = await User.findAll({
        where: {
          houseId: user.houseId,
          id: { [Sequelize.Op.ne]: userId },
        },
      });

      // Create tasks for roommates
      const tasks = roommates.map((roommate) => ({
        userId: roommate.id,
        serviceRequestBundleId: serviceRequestBundle.id,
        type: 'service_request',
        status: false,
      }));
      await Task.bulkCreate(tasks);

      res.status(201).json({
        message: 'Staged request and service request bundle created successfully',
        stagedRequest,
        serviceRequestBundle,
      });
    } catch (error) {
      console.error('Error creating staged request:', error);
      res.status(500).json({ error: 'Failed to create staged request' });
    }
  },

  async updateStagedRequestStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const stagedRequest = await StagedRequest.findByPk(id);

      if (!stagedRequest) {
        return res.status(404).json({ error: 'Staged request not found' });
      }

      stagedRequest.status = status;
      await stagedRequest.save();

      res.status(200).json({ message: 'Staged request status updated successfully', stagedRequest });
    } catch (error) {
      console.error('Error updating staged request status:', error);
      res.status(500).json({ error: 'Failed to update staged request status' });
    }
  },
};

module.exports = stagedRequestController;
