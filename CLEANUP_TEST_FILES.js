// CLEANUP_TEST_FILES.js
// Run this after testing to remove temporary test files

const fs = require('fs');
const path = require('path');

const testFiles = [
  'TEST_DASHBOARD_ENDPOINT.js',
  'DEBUG_DASHBOARD.js',
  'CLEANUP_TEST_FILES.js'
];

console.log('🧹 Cleaning up test files...');

testFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`✅ Deleted: ${file}`);
  } else {
    console.log(`⚠️  Not found: ${file}`);
  }
});

console.log('🎉 Cleanup complete! Test files removed.');
console.log('📝 Keep the integration guides for future reference:');
console.log('   - FRONTEND_DASHBOARD_INTEGRATION_GUIDE.md');
console.log('   - PERFORMANCE_IMPROVEMENTS.md');
console.log('   - FRONTEND_INTEGRATION_PROMPT.md'); 