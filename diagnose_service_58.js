#!/usr/bin/env node

/**
 * DIAGNOSTIC SCRIPT: Analyze House Service 58 Issue
 * 
 * This script investigates why house service 58 didn't get a bill submission created.
 * It checks all the conditions that could have caused the miss.
 */

const { HouseService, BillSubmission, Bill, User } = require('./src/models');
const { Op } = require('sequelize');

async function diagnoseService58() {
  try {
    console.log('🔍 DIAGNOSTIC: Analyzing House Service 58...\n');
    
    // Get the service details
    const service = await HouseService.findByPk(58, {
      include: [{
        model: User,
        as: 'designatedUser',
        attributes: ['id', 'username', 'email']
      }]
    });
    
    if (!service) {
      console.log('❌ Service 58 not found!');
      return;
    }
    
    console.log('📋 SERVICE DETAILS:');
    console.log(`  ID: ${service.id}`);
    console.log(`  Name: ${service.name}`);
    console.log(`  Type: ${service.type}`);
    console.log(`  Status: ${service.status}`);
    console.log(`  Due Day: ${service.dueDay}`);
    console.log(`  Reminder Day: ${service.reminderDay}`);
    console.log(`  Created: ${service.createdAt}`);
    console.log(`  Updated: ${service.updatedAt}`);
    console.log(`  Designated User: ${service.designatedUser ? `${service.designatedUser.username} (ID: ${service.designatedUser.id})` : 'NONE'}`);
    
    // Analyze the timeline
    const createdDate = new Date(service.createdAt);
    const createdDay = createdDate.getDate();
    const createdMonth = createdDate.getMonth();
    const createdYear = createdDate.getFullYear();
    
    console.log('\n📅 TIMELINE ANALYSIS:');
    console.log(`  Service created: ${createdDate.toISOString()} (day ${createdDay})`);
    console.log(`  Due day: ${service.dueDay}`);
    console.log(`  Reminder day: ${service.reminderDay || 'NULL'}`);
    
    // Calculate when bill submission should have been created
    if (service.reminderDay) {
      const reminderDate = new Date(createdYear, createdMonth, service.reminderDay);
      console.log(`  Expected reminder date: ${reminderDate.toISOString()} (day ${service.reminderDay})`);
      
      if (createdDay > service.reminderDay) {
        console.log(`  ⚠️  SERVICE CREATED AFTER REMINDER DAY! This is the issue.`);
        console.log(`     - Service created on day ${createdDay}`);
        console.log(`     - Reminder day is ${service.reminderDay}`);
        console.log(`     - Scheduler already passed for this month`);
      }
    } else {
      console.log(`  ❌ NO REMINDER DAY SET! This would cause the scheduler to skip it.`);
    }
    
    // Check if any bill submissions exist
    console.log('\n🔍 BILL SUBMISSION CHECK:');
    const submissions = await BillSubmission.findAll({
      where: { houseServiceId: 58 },
      order: [['createdAt', 'DESC']]
    });
    
    if (submissions.length === 0) {
      console.log('  ❌ NO BILL SUBMISSIONS FOUND');
    } else {
      console.log(`  Found ${submissions.length} bill submissions:`);
      submissions.forEach((sub, index) => {
        console.log(`    ${index + 1}. ID: ${sub.id}, Status: ${sub.status}, Due: ${sub.dueDate}, Created: ${sub.createdAt}`);
      });
    }
    
    // Check if any bills exist
    console.log('\n🔍 BILL CHECK:');
    const bills = await Bill.findAll({
      where: { houseService_id: 58 },
      order: [['createdAt', 'DESC']]
    });
    
    if (bills.length === 0) {
      console.log('  ❌ NO BILLS FOUND');
    } else {
      console.log(`  Found ${bills.length} bills:`);
      bills.forEach((bill, index) => {
        console.log(`    ${index + 1}. ID: ${bill.id}, Type: ${bill.billType}, Status: ${bill.status}, Due: ${bill.dueDate}, Created: ${bill.createdAt}`);
      });
    }
    
    // Simulate scheduler conditions
    console.log('\n🤖 SCHEDULER SIMULATION:');
    
    // Test different days to see when scheduler would have triggered
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    for (let day = 1; day <= 31; day++) {
      try {
        const testDate = new Date(currentYear, currentMonth, day);
        if (testDate.getMonth() !== currentMonth) break; // Skip invalid dates
        
        const wouldTrigger = service.reminderDay === day;
        const serviceExistedOnDay = testDate >= createdDate;
        
        if (wouldTrigger && serviceExistedOnDay) {
          console.log(`  ✅ Day ${day}: Scheduler WOULD trigger (service existed: ${serviceExistedOnDay})`);
        } else if (wouldTrigger && !serviceExistedOnDay) {
          console.log(`  ⚠️  Day ${day}: Scheduler would trigger but service didn't exist yet`);
        } else if (day === service.reminderDay) {
          console.log(`  🔄 Day ${day}: This is the reminder day`);
        }
      } catch (e) {
        // Skip invalid dates
      }
    }
    
    // Root cause analysis
    console.log('\n🔍 ROOT CAUSE ANALYSIS:');
    
    let rootCause = [];
    
    if (!service.reminderDay) {
      rootCause.push('❌ CRITICAL: reminderDay is NULL - scheduler will never trigger');
    }
    
    if (!service.designatedUser) {
      rootCause.push('❌ CRITICAL: No designated user - even if triggered, would be skipped');
    }
    
    if (service.status !== 'active') {
      rootCause.push('❌ CRITICAL: Service is not active - scheduler will skip');
    }
    
    if (service.type !== 'variable_recurring') {
      rootCause.push('❌ CRITICAL: Service is not variable_recurring - wrong type');
    }
    
    if (service.reminderDay && createdDay > service.reminderDay) {
      rootCause.push('⚠️  TIMING ISSUE: Service created after reminder day for the month');
    }
    
    if (rootCause.length === 0) {
      rootCause.push('✅ No obvious configuration issues found - may be a timing or scheduler issue');
    }
    
    rootCause.forEach(cause => console.log(`  ${cause}`));
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (!service.reminderDay) {
      const suggestedReminderDay = Math.max(1, (service.dueDay || 1) - 7);
      console.log(`  1. Set reminderDay to ${suggestedReminderDay} (7 days before due day ${service.dueDay})`);
    }
    
    if (createdDay > service.reminderDay) {
      console.log(`  2. For services created after reminder day, immediately create bill submission`);
    }
    
    console.log(`  3. Run the safeguard check: POST /api/bills/check-missing-submissions`);
    console.log(`  4. Run the fix script: node fix_missing_reminder_days.js`);
    
    // Show what the safeguard would do
    console.log('\n🛡️  SAFEGUARD SIMULATION:');
    const dueDay = service.dueDay || 1;
    const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    if (dueDate < today) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    
    const reminderDay = service.reminderDay;
    const shouldHaveCreatedBy = reminderDay ? 
      new Date(today.getFullYear(), today.getMonth(), reminderDay) : 
      new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const isOverdue = today >= shouldHaveCreatedBy;
    const isPastDue = today > dueDate;
    
    console.log(`  Due date: ${dueDate.toISOString()}`);
    console.log(`  Should have been created by: ${shouldHaveCreatedBy.toISOString()}`);
    console.log(`  Is overdue for creation: ${isOverdue}`);
    console.log(`  Is past due date: ${isPastDue}`);
    
    if (isOverdue || isPastDue) {
      console.log(`  🚨 SAFEGUARD WOULD CREATE URGENT BILL SUBMISSION`);
    } else {
      console.log(`  ✅ Not yet time for safeguard to trigger`);
    }
    
  } catch (error) {
    console.error('❌ Error in diagnostic:', error);
  }
}

// Run the diagnostic if this script is executed directly
if (require.main === module) {
  diagnoseService58()
    .then(() => {
      console.log('\n✅ Diagnostic completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Diagnostic failed:', error);
      process.exit(1);
    });
}

module.exports = { diagnoseService58 };

