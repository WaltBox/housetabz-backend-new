const jwt = require('jsonwebtoken');

// Production JWT_SECRET
const PRODUCTION_JWT_SECRET = '2c4a4f2f4f2b8a1d0e9d42c8c3b4f1e5a2c5b3d4e6a1f2c8b3d4e6f7a8b9c0d1';

function generateProductionToken(userId) {
  try {
    // Generate token with 30 day expiration
    const token = jwt.sign(
      { id: userId }, 
      PRODUCTION_JWT_SECRET, 
      { expiresIn: '30d' }
    );

    return token;
  } catch (error) {
    throw new Error(`Failed to generate production token: ${error.message}`);
  }
}

async function main() {
  const userId = process.argv[2] || 5;
  
  try {
    const token = generateProductionToken(parseInt(userId));
    
    console.log('✅ Production token generated successfully!');
    console.log('==========================================');
    console.log(`User ID: ${userId}`);
    console.log('');
    console.log('Bearer Token:');
    console.log(`Bearer ${token}`);
    console.log('');
    console.log('For curl testing:');
    console.log(`curl -w "Total time: %{time_total}s\\nStatus: %{http_code}\\n" -H "Authorization: Bearer ${token}" -s -o /dev/null https://api.housetabz.com/api/dashboard/user/${userId}`);
    
  } catch (error) {
    console.error('❌ Error generating production token:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateProductionToken }; 