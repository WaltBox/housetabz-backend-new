const { Notification, User, sequelize } = require('../models');
const AWS = require('aws-sdk');

// Configure AWS SNS for push notifications
const sns = new AWS.SNS({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Get all notifications for a specific user
exports.getNotificationsForUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Add authorization check
    if (req.user.id != userId) {
      return res.status(403).json({ message: 'Unauthorized access to notifications' });
    }

    const notifications = await Notification.findAll({ 
      where: { userId }, 
      order: [['createdAt', 'DESC']] 
    });
    
    if (!notifications.length) {
      return res.status(200).json([]);  // Return empty array instead of 404
    }

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    next(error);
  }
};

// Get a specific notification by ID for a user
exports.getNotificationById = async (req, res, next) => {
  try {
    const { userId, notificationId } = req.params;
    
    // Add authorization check
    if (req.user.id != userId) {
      return res.status(403).json({ message: 'Unauthorized access to notification' });
    }

    const notification = await Notification.findOne({ 
      where: { userId, id: notificationId } 
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.status(200).json(notification);
  } catch (error) {
    console.error('Error fetching notification:', error);
    next(error);
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { userId, notificationId } = req.params;
    
    // Add authorization check
    if (req.user.id != userId) {
      return res.status(403).json({ message: 'Unauthorized access to notification' });
    }

    const notification = await Notification.findOne({ 
      where: { userId, id: notificationId } 
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ 
      message: 'Notification marked as read.', 
      notification 
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    next(error);
  }
};

// Register a device for push notifications
exports.registerDeviceToken = async (req, res, next) => {
  try {
    const { deviceToken, deviceType } = req.body;
    const userId = req.user.id;
    
    if (!deviceToken || !deviceType) {
      return res.status(400).json({ message: 'Device token and type are required' });
    }
    
    // First, create an SNS platform endpoint
    let platformApplicationArn;
    
    if (deviceType.toLowerCase() === 'ios') {
      // Use the appropriate ARN for your iOS app
      platformApplicationArn = process.env.AWS_SNS_IOS_ARN;
    } else if (deviceType.toLowerCase() === 'android') {
      // Use the appropriate ARN for your Android app
      platformApplicationArn = process.env.AWS_SNS_ANDROID_ARN;
    } else {
      return res.status(400).json({ message: 'Invalid device type. Must be "ios" or "android"' });
    }
    
    try {
      // Create an endpoint for this device
      const endpointParams = {
        PlatformApplicationArn: platformApplicationArn,
        Token: deviceToken,
        CustomUserData: userId.toString()
      };
      
      const endpointData = await sns.createPlatformEndpoint(endpointParams).promise();
      const endpointArn = endpointData.EndpointArn;
      
      // Store the device token in your database
      await sequelize.models.DeviceToken.upsert({
        userId,
        token: deviceToken,
        deviceType,
        endpointArn,
        isActive: true
      });
      
      res.status(200).json({ 
        message: 'Device registered successfully for push notifications',
        endpointArn
      });
    } catch (snsError) {
      console.error('SNS Error:', snsError);
      
      // Handle case where endpoint already exists
      if (snsError.code === 'InvalidParameter' && snsError.message.includes('already exists')) {
        // Get the existing endpoint ARN from the error message
        const arnMatch = snsError.message.match(/Endpoint (arn:aws:sns:[^\s]+) already exists/);
        if (arnMatch && arnMatch[1]) {
          const existingArn = arnMatch[1];
          
          // Update the existing record
          await sequelize.models.DeviceToken.upsert({
            userId,
            token: deviceToken,
            deviceType,
            endpointArn: existingArn,
            isActive: true
          });
          
          return res.status(200).json({ 
            message: 'Device token updated successfully',
            endpointArn: existingArn
          });
        }
      }
      
      return res.status(500).json({ message: 'Failed to register device with SNS' });
    }
  } catch (error) {
    console.error('Error registering device token:', error);
    next(error);
  }
};

// Create a notification and send push notification if applicable
exports.createNotification = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId, title, message, type, data = {} } = req.body;
    
    if (!userId || !title || !message) {
      await transaction.rollback();
      return res.status(400).json({ message: 'userId, title, and message are required' });
    }
    
    // Create in-app notification
    const notification = await Notification.create({
      userId,
      title,
      message,
      type: type || 'general',
      metadata: data,
      isRead: false
    }, { transaction });
    
    // Check if the user has registered device tokens for push notifications
    const deviceTokens = await sequelize.models.DeviceToken.findAll({
      where: { 
        userId,
        isActive: true
      }
    });
    
    // If device tokens exist, send push notifications
    if (deviceTokens && deviceTokens.length > 0) {
      for (const device of deviceTokens) {
        try {
          // Prepare message payload based on device type
          const messagePayload = {
            default: message,
            GCM: JSON.stringify({
              notification: {
                title,
                body: message,
                sound: 'default'
              },
              data: {
                ...data,
                notificationId: notification.id,
                type: type || 'general'
              }
            }),
            APNS: JSON.stringify({
              aps: {
                alert: {
                  title,
                  body: message
                },
                sound: 'default',
                badge: 1
              },
              notificationId: notification.id,
              type: type || 'general',
              ...data
            }),
            APNS_SANDBOX: JSON.stringify({
              aps: {
                alert: {
                  title,
                  body: message
                },
                sound: 'default',
                badge: 1
              },
              notificationId: notification.id,
              type: type || 'general',
              ...data
            })
          };
          
          // Send push notification via SNS
          const params = {
            Message: JSON.stringify(messagePayload),
            MessageStructure: 'json',
            TargetArn: device.endpointArn
          };
          
          await sns.publish(params).promise();
        } catch (pushError) {
          console.error('Error sending push notification:', pushError);
          
          // If endpoint is disabled or invalid, mark as inactive
          if (
            pushError.code === 'EndpointDisabled' ||
            pushError.code === 'InvalidParameter'
          ) {
            await device.update({ isActive: false });
          }
          
          // Continue to next device - we don't want to fail the whole operation
          // if one push notification fails
        }
      }
    }
    
    await transaction.commit();
    
    res.status(201).json({ 
      message: 'Notification created successfully',
      notification 
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating notification:', error);
    next(error);
  }
};

// Unregister a device token
exports.unregisterDeviceToken = async (req, res, next) => {
  try {
    const { deviceToken } = req.body;
    const userId = req.user.id;
    
    if (!deviceToken) {
      return res.status(400).json({ message: 'Device token is required' });
    }
    
    // Find the device token record
    const deviceTokenRecord = await sequelize.models.DeviceToken.findOne({
      where: { 
        userId,
        token: deviceToken
      }
    });
    
    if (!deviceTokenRecord) {
      return res.status(404).json({ message: 'Device token not found' });
    }
    
    // Update the device token as inactive
    await deviceTokenRecord.update({ isActive: false });
    
    // Optionally, delete the SNS endpoint
    if (deviceTokenRecord.endpointArn) {
      try {
        await sns.deleteEndpoint({
          EndpointArn: deviceTokenRecord.endpointArn
        }).promise();
      } catch (snsError) {
        console.error('Error deleting SNS endpoint:', snsError);
        // We'll continue even if SNS deletion fails
      }
    }
    
    res.status(200).json({ message: 'Device unregistered successfully' });
  } catch (error) {
    console.error('Error unregistering device:', error);
    next(error);
  }
};