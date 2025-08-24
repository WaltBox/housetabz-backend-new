#!/usr/bin/env node

/**
 * BILL SUBMISSION TROUBLESHOOTING CLI TOOL
 * 
 * Command-line tool to troubleshoot bill submission issues.
 * 
 * Usage:
 *   node troubleshoot_bill_submissions.js health          # Get health report
 *   node troubleshoot_bill_submissions.js critical        # Get critical issues
 *   node troubleshoot_bill_submissions.js service 58      # Troubleshoot specific service
 *   node troubleshoot_bill_submissions.js diagnose 58     # Deep diagnostic
 *   node troubleshoot_bill_submissions.js safeguard       # Run safeguard check
 */

const billSubmissionMonitoringService = require('./src/services/billSubmissionMonitoringService');
const billService = require('./src/services/billService');

async function main() {
  const command = process.argv[2];
  const serviceId = process.argv[3];
  
  try {
    switch (command) {
      case 'health':
        await healthReport();
        break;
        
      case 'critical':
        await criticalIssues();
        break;
        
      case 'service':
        if (!serviceId) {
          console.log('❌ Please provide a service ID');
          process.exit(1);
        }
        await troubleshootService(serviceId);
        break;
        
      case 'diagnose':
        if (!serviceId) {
          console.log('❌ Please provide a service ID');
          process.exit(1);
        }
        await diagnoseService(serviceId);
        break;
        
      case 'safeguard':
        await runSafeguard();
        break;
        
      default:
        showUsage();
        process.exit(1);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function healthReport() {
  console.log('📊 GENERATING HEALTH REPORT...\n');
  
  const report = await billSubmissionMonitoringService.getHealthReport();
  
  console.log('📋 SUMMARY:');
  console.log(`  Total services: ${report.totalServices}`);
  console.log(`  ✅ Healthy: ${report.summary.healthy}`);
  console.log(`  ⚠️  Need attention: ${report.summary.needsAttention}`);
  console.log(`  🚨 Critical: ${report.summary.critical}`);
  
  if (report.summary.critical > 0) {
    console.log('\n🚨 CRITICAL ISSUES:');
    report.services
      .filter(s => s.status === 'critical')
      .forEach(service => {
        console.log(`  Service ${service.serviceId} (${service.serviceName}):`);
        service.issues.forEach(issue => {
          console.log(`    - ${issue.message}`);
        });
      });
  }
  
  if (report.issues.missingReminderDay.length > 0) {
    console.log('\n⚠️  MISSING REMINDER DAYS:');
    report.issues.missingReminderDay.forEach(service => {
      console.log(`  - Service ${service.serviceId} (${service.serviceName})`);
    });
  }
  
  if (report.issues.missedSubmissions.length > 0) {
    console.log('\n🚨 MISSED SUBMISSIONS:');
    report.issues.missedSubmissions.forEach(service => {
      console.log(`  - Service ${service.serviceId} (${service.serviceName})`);
    });
  }
  
  if (report.issues.potentialTimingGaps && report.issues.potentialTimingGaps.length > 0) {
    console.log('\n⚠️  POTENTIAL TIMING GAPS (May Need Manual Review):');
    report.issues.potentialTimingGaps.forEach(service => {
      console.log(`  - Service ${service.serviceId} (${service.serviceName})`);
      const timingIssue = service.issues.find(i => i.type === 'potential_timing_gap');
      if (timingIssue) {
        console.log(`    ${timingIssue.details}`);
      }
    });
  }
  
  console.log('\n💡 NEXT STEPS:');
  console.log('  1. Fix services with missing reminderDay: node fix_missing_reminder_days.js');
  console.log('  2. Run safeguard check: node troubleshoot_bill_submissions.js safeguard');
  console.log('  3. Check specific services: node troubleshoot_bill_submissions.js service <ID>');
}

async function criticalIssues() {
  console.log('🚨 GETTING CRITICAL ISSUES...\n');
  
  const issues = await billSubmissionMonitoringService.getCriticalIssues();
  
  console.log(`Found ${issues.criticalCount} critical issues:`);
  
  if (issues.criticalCount === 0) {
    console.log('✅ No critical issues found!');
    return;
  }
  
  issues.criticalServices.forEach(service => {
    console.log(`\n🚨 Service ${service.serviceId} (${service.serviceName}):`);
    service.issues
      .filter(issue => issue.severity === 'critical')
      .forEach(issue => {
        console.log(`  - ${issue.message}`);
        console.log(`    ${issue.details}`);
      });
    
    if (service.recommendations.length > 0) {
      console.log('  💡 Recommendations:');
      service.recommendations.forEach(rec => {
        console.log(`    - ${rec}`);
      });
    }
  });
}

async function troubleshootService(serviceId) {
  console.log(`🔍 TROUBLESHOOTING SERVICE ${serviceId}...\n`);
  
  const troubleshooting = await billSubmissionMonitoringService.troubleshootService(serviceId);
  
  console.log('📋 SERVICE DETAILS:');
  console.log(`  ID: ${troubleshooting.service.id}`);
  console.log(`  Name: ${troubleshooting.service.name}`);
  console.log(`  Type: ${troubleshooting.service.type}`);
  console.log(`  Status: ${troubleshooting.service.status}`);
  console.log(`  Due Day: ${troubleshooting.service.dueDay}`);
  console.log(`  Reminder Day: ${troubleshooting.service.reminderDay || 'NULL'}`);
  console.log(`  Created: ${troubleshooting.service.createdAt}`);
  console.log(`  Designated User: ${troubleshooting.service.designatedUser ? troubleshooting.service.designatedUser.username : 'NONE'}`);
  
  console.log(`\n📊 ANALYSIS: ${troubleshooting.analysis.status.toUpperCase()}`);
  
  if (troubleshooting.analysis.issues.length > 0) {
    console.log('\n🚨 ISSUES FOUND:');
    troubleshooting.analysis.issues.forEach(issue => {
      console.log(`  ${issue.severity.toUpperCase()}: ${issue.message}`);
      if (issue.details) {
        console.log(`    Details: ${issue.details}`);
      }
    });
  }
  
  if (troubleshooting.analysis.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    troubleshooting.analysis.recommendations.forEach(rec => {
      console.log(`  - ${rec}`);
    });
  }
  
  console.log('\n📈 HISTORY:');
  console.log(`  Bill submissions: ${troubleshooting.history.submissions.length}`);
  console.log(`  Bills: ${troubleshooting.history.bills.length}`);
  
  if (troubleshooting.history.submissions.length > 0) {
    console.log('  Recent submissions:');
    troubleshooting.history.submissions.slice(0, 3).forEach(sub => {
      console.log(`    - ${sub.id}: ${sub.status} (due: ${sub.dueDate})`);
    });
  }
  
  console.log('\n🔧 TROUBLESHOOTING STEPS:');
  troubleshooting.troubleshooting.nextSteps.forEach(step => {
    console.log(`  ${step}`);
  });
}

async function diagnoseService(serviceId) {
  console.log(`🔬 DEEP DIAGNOSTIC FOR SERVICE ${serviceId}...\n`);
  
  // Use our existing diagnostic script
  const { diagnoseService58 } = require('./diagnose_service_58.js');
  
  // For now, just run the troubleshoot - in the future we could make diagnose_service_58 more generic
  await troubleshootService(serviceId);
  
  console.log('\n🔬 For detailed diagnostic, run:');
  console.log(`  node diagnose_service_58.js  # (modify for service ${serviceId})`);
}

async function runSafeguard() {
  console.log('🛡️  RUNNING SAFEGUARD CHECK...\n');
  
  const result = await billService.checkAndCreateMissingBillSubmissions();
  
  console.log('📊 SAFEGUARD RESULTS:');
  console.log(`  Total services checked: ${result.totalServices}`);
  console.log(`  ✅ Created submissions: ${result.createdCount}`);
  console.log(`  ⏭️  Skipped: ${result.skippedCount}`);
  console.log(`  ❌ Errors: ${result.errorCount}`);
  
  if (result.createdCount > 0) {
    console.log('\n🚨 URGENT SUBMISSIONS CREATED:');
    result.results
      .filter(r => r.action === 'created_urgent')
      .forEach(r => {
        console.log(`  - Service ${r.serviceId} (${r.serviceName})`);
        console.log(`    Due: ${r.dueDate}`);
        console.log(`    Overdue: ${r.isOverdue ? 'YES' : 'No'}`);
      });
  }
  
  if (result.errorCount > 0) {
    console.log('\n❌ ERRORS:');
    result.results
      .filter(r => r.action === 'error')
      .forEach(r => {
        console.log(`  - Service ${r.serviceId}: ${r.error}`);
      });
  }
}

function showUsage() {
  console.log('📋 BILL SUBMISSION TROUBLESHOOTING TOOL');
  console.log('');
  console.log('Usage:');
  console.log('  node troubleshoot_bill_submissions.js health          # Get health report');
  console.log('  node troubleshoot_bill_submissions.js critical        # Get critical issues');
  console.log('  node troubleshoot_bill_submissions.js service 58      # Troubleshoot specific service');
  console.log('  node troubleshoot_bill_submissions.js diagnose 58     # Deep diagnostic');
  console.log('  node troubleshoot_bill_submissions.js safeguard       # Run safeguard check');
  console.log('');
  console.log('Examples:');
  console.log('  node troubleshoot_bill_submissions.js health');
  console.log('  node troubleshoot_bill_submissions.js service 58');
  console.log('  node troubleshoot_bill_submissions.js safeguard');
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { main };
