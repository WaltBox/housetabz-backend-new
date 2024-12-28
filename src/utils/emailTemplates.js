// src/utils/emailTemplates.js

// Function to generate the welcome email HTML
const createWelcomeEmail = (recipientName) => `
  <div style="font-family: Arial, sans-serif; background-color: #dff6f0; color: #333; padding: 20px;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="https://housetabz-assets.s3.us-east-1.amazonaws.com/assets/housetabzlogo.png" alt="HouseTabz Logo" style="width: 150px; height: auto;">
    </div>

    <!-- Main Content -->
    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
      <h1 style="color: #34d399; font-size: 24px; margin-bottom: 20px;">Welcome to HouseTabz, ${recipientName}!</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        We're thrilled to have you join the <strong>HouseTabz Waitlist</strong>. Thank you for being part of our journey to revolutionize shared living expenses.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        Stay tuned for updates, exclusive perks, and early access to our platform. We can't wait to share more with you soon!
      </p>
    </div>

    <!-- Call to Action -->
    <div style="margin-top: 20px; text-align: center;">
      <a href="https://www.housetabz.com" style="
        display: inline-block;
        background-color: #34d399;
        color: #ffffff;
        text-decoration: none;
        font-weight: bold;
        padding: 10px 20px;
        border-radius: 5px;
        font-size: 16px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      ">
        Explore HouseTabz
      </a>
    </div>

    <!-- Footer -->
    <footer style="margin-top: 40px; font-size: 14px; color: #666; text-align: center;">
      <p>Follow us for updates:</p>
      <div style="margin: 10px 0;">
        <a href="https://www.linkedin.com/company/104392401" style="margin: 0 10px;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" alt="LinkedIn" style="width: 24px; height: 24px;">
        </a>
        <a href="https://www.instagram.com/housetabz?igsh=MTRjMTY3NmllZDE2Ng==" style="margin: 0 10px;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram" style="width: 24px; height: 24px;">
        </a>
      </div>
      <p>&copy; ${new Date().getFullYear()} HouseTabz. All rights reserved.</p>
    </footer>
  </div>
`;

module.exports = { createWelcomeEmail };
