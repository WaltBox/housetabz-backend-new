const jwt = require('jsonwebtoken');
const { User } = require('./src/models');

// Load environment variables
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function generateTestToken(userId) {
  try {
    // Verify user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Generate token (30 day expiration)
    const token = jwt.sign(
      { id: user.id }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        houseId: user.houseId
      }
    };
  } catch (error) {
    throw new Error(`Failed to generate token: ${error.message}`);
  }
}

async function main() {
  const userId = process.argv[2];
  
  if (!userId) {
    console.log('Usage: node generate_test_token.js <userId>');
    console.log('Example: node generate_test_token.js 5');
    return;
  }

  try {
    const result = await generateTestToken(parseInt(userId));
    
    console.log('✅ Test token generated successfully!');
    console.log('=====================================');
    console.log(`User: ${result.user.username} (${result.user.email})`);
    console.log(`House ID: ${result.user.houseId}`);
    console.log('');
    console.log('Bearer Token:');
    console.log(`Bearer ${result.token}`);
    console.log('');
    console.log('For curl requests:');
    console.log(`curl -H "Authorization: Bearer ${result.token}" https://api.housetabz.com/api/dashboard/user/${userId}`);
    
  } catch (error) {
    console.error('❌ Error generating token:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateTestToken }; 