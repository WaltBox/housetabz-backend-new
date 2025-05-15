// src/services/emailService.js
const AWS = require('aws-sdk');
const { createWelcomeEmail } = require('../utils/emailTemplates');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Create SES service object
const ses = new AWS.SES({ apiVersion: '2010-12-01' });

/**
 * Send an email using AWS SES
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML content
 * @param {string} [params.text] - Plain text content (optional)
 * @returns {Promise<boolean>} - Success status
 */
const sendEmail = async (params) => {
  try {
    // Check if we're in development mode without SES config
    if (process.env.NODE_ENV === 'development_local' && !process.env.AWS_ACCESS_KEY_ID) {
      console.log('==================');
      console.log('EMAIL NOT SENT IN DEV MODE (SES not configured)');
      console.log('To:', params.to);
      console.log('From:', process.env.EMAIL_FROM || 'noreply@housetabz.com');
      console.log('Subject:', params.subject);
      console.log('HTML:', params.html);
      if (params.text) console.log('Text:', params.text);
      console.log('==================');
      return true;
    }

    const sesParams = {
      Source: process.env.EMAIL_FROM || 'noreply@housetabz.com',
      Destination: {
        ToAddresses: [params.to]
      },
      Message: {
        Subject: {
          Data: params.subject
        },
        Body: {
          Text: {
            Data: params.text || stripHtml(params.html)
          },
          Html: {
            Data: params.html
          }
        }
      }
    };

    const result = await ses.sendEmail(sesParams).promise();
    console.log('Email sent successfully:', result.MessageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

/**
 * Strip HTML tags to create plain text version
 * @param {string} html - HTML content
 * @returns {string} - Plain text content
 */
const stripHtml = (html) => {
  return html.replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Create password reset email HTML template
 * @param {string} resetCode - The password reset code
 * @returns {string} - HTML email content
 */
const createPasswordResetEmail = (resetCode) => `
  <div style="font-family: Arial, sans-serif; background-color: #dff6f0; color: #333333; padding: 20px; max-width: 600px; margin: 0 auto;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="https://housetabz-assets.s3.us-east-1.amazonaws.com/assets/housetabzlogo-update.png" alt="HouseTabz Logo" style="width: 150px; height: auto;">
    </div>
    
    <!-- Main Content -->
    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
      <h1 style="color: #34d399; font-size: 24px; margin-bottom: 20px;">Reset Your Password</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #333333;">
        You've requested to reset your password for your HouseTabz account.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #333333;">
        Enter this code in the app to reset your password. The code will expire in 10 minutes.
      </p>
      
      <!-- Reset Code -->
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-size: 28px; text-align: center; letter-spacing: 5px; margin: 20px 0; font-weight: bold; color: #333;">
        ${resetCode}
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: #333333;">
        If you didn't request this reset, please ignore this email or contact our support team if you have concerns.
      </p>
    </div>
    
    <!-- Footer -->
    <footer style="margin-top: 40px; font-size: 14px; color: #666666; text-align: center;">
      <p>Follow us for updates:</p>
      <div style="margin: 10px 0;">
        <a href="https://www.linkedin.com/company/104392401" style="margin: 0 10px; display: inline-block;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" alt="LinkedIn" style="width: 24px; height: 24px;">
        </a>
        <a href="https://www.instagram.com/housetabz?igsh=MTRjMTY3NmllZDE2Ng==" style="margin: 0 10px; display: inline-block;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram" style="width: 24px; height: 24px;">
        </a>
      </div>
      <p>&copy; ${new Date().getFullYear()} HouseTabz. All rights reserved.</p>
    </footer>
  </div>
`;

/**
 * Create contact confirmation email HTML template
 * @param {string} name - Recipient name
 * @returns {string} - HTML email content
 */
const createContactConfirmationEmail = (name) => `
  <div style="font-family: Arial, sans-serif; background-color: #dff6f0; color: #333333; padding: 20px; max-width: 600px; margin: 0 auto;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="https://housetabz-assets.s3.us-east-1.amazonaws.com/assets/housetabzlogo-update.png" alt="HouseTabz Logo" style="width: 150px; height: auto;">
    </div>
    
    <!-- Main Content -->
    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
      <h1 style="color: #34d399; font-size: 24px; margin-bottom: 20px;">Thank You for Reaching Out!</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #333333;">
        Hi ${name},
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #333333;">
        Thank you for contacting HouseTabz. Our team will review your message and get back to you as soon as possible.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #333333; margin-top: 20px;">
        Best regards,<br>
        HouseTabz Team
      </p>
    </div>
    
    <!-- Footer -->
    <footer style="margin-top: 40px; font-size: 14px; color: #666666; text-align: center;">
      <p>Follow us for updates:</p>
      <div style="margin: 10px 0;">
        <a href="https://www.linkedin.com/company/104392401" style="margin: 0 10px; display: inline-block;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" alt="LinkedIn" style="width: 24px; height: 24px;">
        </a>
        <a href="https://www.instagram.com/housetabz?igsh=MTRjMTY3NmllZDE2Ng==" style="margin: 0 10px; display: inline-block;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram" style="width: 24px; height: 24px;">
        </a>
      </div>
      <p>&copy; ${new Date().getFullYear()} HouseTabz. All rights reserved.</p>
    </footer>
  </div>
`;

/**
 * Send password reset code via email
 * @param {string} email - Recipient email address
 * @param {string} resetCode - The password reset code
 * @returns {Promise<boolean>} - Success status
 */
const sendPasswordResetCode = async (email, resetCode) => {
  const html = createPasswordResetEmail(resetCode);

  return sendEmail({
    to: email,
    subject: 'Your HouseTabz Password Reset Code',
    html
  });
};

/**
 * Send welcome email to waitlist members
 * @param {string} name - Recipient name
 * @param {string} email - Recipient email
 * @returns {Promise<boolean>} - Success status
 */
const sendWelcomeEmail = async (name, email) => {
  const html = createWelcomeEmail(name);

  return sendEmail({
    to: email,
    subject: 'Welcome to HouseTabz!',
    html
  });
};

/**
 * Send contact form confirmation email
 * @param {string} name - Recipient name
 * @param {string} email - Recipient email
 * @returns {Promise<boolean>} - Success status
 */
const sendContactConfirmationEmail = async (name, email) => {
  const html = createContactConfirmationEmail(name);

  return sendEmail({
    to: email,
    subject: 'We Received Your Message!',
    html
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetCode,
  sendWelcomeEmail,
  sendContactConfirmationEmail
};