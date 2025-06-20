// scripts/urgentMessageScript.js  
const { sequelize } = require('../models'); 
const urgentMessageService = require('../services/urgentMessageService');  

async function generateUrgentMessages() {   
  try {     
    console.log('Starting urgent message generation process...');          
    
    // Connect to the database     
    await sequelize.authenticate();     
    console.log('Database connection established successfully');          
    
    console.log('Generating urgent messages...');     
    await urgentMessageService.refreshUrgentMessages();     
    console.log('Urgent messages generated successfully');          
    
    console.log('All urgent messages generated successfully!');          
    
    // Close the database connection     
    await sequelize.close();     
    console.log('Database connection closed');          
    
    // Exit process successfully     
    process.exit(0);   
  } catch (error) {     
    console.error('Error generating urgent messages:', error);          
    
    // Try to close the database connection     
    try {       
      await sequelize.close();       
      console.log('Database connection closed');     
    } catch (closeError) {       
      console.error('Error closing database connection:', closeError);     
    }          
    
    // Exit with error code     
    process.exit(1);   
  } 
}  

// Run the function 
generateUrgentMessages();