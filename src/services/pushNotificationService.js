// pushNotificationService.js
const { sequelize } = require('../models');
const AWS = require('aws-sdk');

const sns = new AWS.SNS({
  region:     process.env.AWS_REGION || 'us-east-1',
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

/**
 * Send a push to all active endpoints for this user.
 *
 * @param {Object} user
 * @param {string} user.id
 * @param {{ title: string, message: string, data: Object }} payload
 */
async function sendPushNotification(user, { title, message, data }) {
  // fetch active device tokens
  const deviceTokens = await sequelize.models.DeviceToken.findAll({
    where: { userId: user.id, isActive: true }
  });

  if (!deviceTokens.length) {
    console.log(`No device tokens for user ${user.id}`);
    return;
  }

  for (const device of deviceTokens) {
    // figure out sandbox vs production by ARN
    const isSandbox = device.endpointArn.includes('APNS_SANDBOX');
    const apnsKey   = isSandbox ? 'APNS_SANDBOX' : 'APNS';

    // build per‑platform payload
    const payload = {
      default: message,
      GCM: JSON.stringify({
        notification: { title, body: message, sound: 'default' },
        data
      }),
      [apnsKey]: JSON.stringify({
        aps: {
          alert: { title, body: message },
          sound: 'default',
          badge: 1
        },
        ...data
      })
    };

    const params = {
      Message:          JSON.stringify(payload),
      MessageStructure: 'json',
      TargetArn:        device.endpointArn
    };

    try {
      await sns.publish(params).promise();
      console.log(`Push sent to ${device.endpointArn}`);
    } catch (err) {
      console.error(`Push failed for ${device.endpointArn}:`, err);

      // disable permanently invalid endpoints
      if (['EndpointDisabled', 'InvalidParameter'].includes(err.code)) {
        await device.update({ isActive: false });
      }
    }
  }
}

module.exports = { sendPushNotification };
