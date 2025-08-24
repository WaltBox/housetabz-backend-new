// src/controllers/billSubmissionMonitoringController.js

const billSubmissionMonitoringService = require('../services/billSubmissionMonitoringService');
const logger = require('../utils/logger');

/**
 * BILL SUBMISSION MONITORING CONTROLLER
 * 
 * Provides admin endpoints for monitoring and troubleshooting
 * variable recurring service bill submissions.
 */

const billSubmissionMonitoringController = {
  
  /**
   * Get comprehensive health report for all variable recurring services
   * GET /api/admin/bill-submissions/health-report
   */
  async getHealthReport(req, res) {
    try {
      console.log('📊 Admin request: Bill submission health report');
      
      const report = await billSubmissionMonitoringService.getHealthReport();
      
      // Log summary for monitoring
      console.log(`📊 Health Report Summary: ${report.summary.healthy} healthy, ${report.summary.needsAttention} need attention, ${report.summary.critical} critical`);
      
      if (report.summary.critical > 0) {
        console.error(`🚨 ALERT: ${report.summary.critical} services have critical issues!`);
      }
      
      res.status(200).json({
        message: 'Health report generated successfully',
        report
      });
      
    } catch (error) {
      console.error('❌ Error generating health report:', error);
      res.status(500).json({
        error: 'Failed to generate health report',
        details: error.message
      });
    }
  },
  
  /**
   * Get only services with critical issues
   * GET /api/admin/bill-submissions/critical-issues
   */
  async getCriticalIssues(req, res) {
    try {
      console.log('🚨 Admin request: Critical bill submission issues');
      
      const criticalIssues = await billSubmissionMonitoringService.getCriticalIssues();
      
      if (criticalIssues.criticalCount > 0) {
        console.error(`🚨 FOUND ${criticalIssues.criticalCount} CRITICAL ISSUES!`);
      } else {
        console.log('✅ No critical issues found');
      }
      
      res.status(200).json({
        message: `Found ${criticalIssues.criticalCount} critical issues`,
        issues: criticalIssues
      });
      
    } catch (error) {
      console.error('❌ Error getting critical issues:', error);
      res.status(500).json({
        error: 'Failed to get critical issues',
        details: error.message
      });
    }
  },
  
  /**
   * Troubleshoot a specific service
   * GET /api/admin/bill-submissions/troubleshoot/:serviceId
   */
  async troubleshootService(req, res) {
    try {
      const { serviceId } = req.params;
      
      console.log(`🔍 Admin request: Troubleshoot service ${serviceId}`);
      
      const troubleshooting = await billSubmissionMonitoringService.troubleshootService(serviceId);
      
      console.log(`🔍 Service ${serviceId} status: ${troubleshooting.analysis.status}`);
      
      if (troubleshooting.analysis.issues.length > 0) {
        console.log(`⚠️  Service ${serviceId} has ${troubleshooting.analysis.issues.length} issues`);
      }
      
      res.status(200).json({
        message: `Troubleshooting report for service ${serviceId}`,
        troubleshooting
      });
      
    } catch (error) {
      console.error(`❌ Error troubleshooting service ${req.params.serviceId}:`, error);
      res.status(500).json({
        error: 'Failed to troubleshoot service',
        details: error.message
      });
    }
  },
  
  /**
   * Get a quick dashboard summary
   * GET /api/admin/bill-submissions/dashboard
   */
  async getDashboard(req, res) {
    try {
      console.log('📊 Admin request: Bill submission dashboard');
      
      const [healthReport, criticalIssues] = await Promise.all([
        billSubmissionMonitoringService.getHealthReport(),
        billSubmissionMonitoringService.getCriticalIssues()
      ]);
      
      const dashboard = {
        timestamp: new Date().toISOString(),
        summary: healthReport.summary,
        alerts: {
          critical: criticalIssues.criticalCount,
          missedSubmissions: healthReport.issues.missedSubmissions.length,
          missingConfig: healthReport.issues.missingReminderDay.length + healthReport.issues.missingDesignatedUser.length
        },
        recentIssues: criticalIssues.criticalServices.slice(0, 5), // Top 5 critical
        recommendations: [
          'Run daily safeguard checks',
          'Fix services with missing reminderDay',
          'Assign designated users to all services',
          'Monitor new service creation timing'
        ]
      };
      
      console.log(`📊 Dashboard: ${dashboard.summary.total} services, ${dashboard.alerts.critical} critical alerts`);
      
      res.status(200).json({
        message: 'Dashboard data retrieved successfully',
        dashboard
      });
      
    } catch (error) {
      console.error('❌ Error generating dashboard:', error);
      res.status(500).json({
        error: 'Failed to generate dashboard',
        details: error.message
      });
    }
  },
  
  /**
   * Run diagnostic on a specific service (like service 58)
   * POST /api/admin/bill-submissions/diagnose/:serviceId
   */
  async diagnoseSpecificService(req, res) {
    try {
      const { serviceId } = req.params;
      
      console.log(`🔬 Admin request: Deep diagnostic for service ${serviceId}`);
      
      // Get comprehensive analysis
      const troubleshooting = await billSubmissionMonitoringService.troubleshootService(serviceId);
      
      // Add additional diagnostic information
      const today = new Date();
      const service = troubleshooting.service;
      
      const diagnostic = {
        ...troubleshooting,
        deepAnalysis: {
          schedulerSimulation: this.simulateSchedulerBehavior(service, today),
          timelineAnalysis: this.analyzeTimeline(service, today),
          configurationCheck: this.checkConfiguration(service),
          historicalPattern: this.analyzeHistoricalPattern(troubleshooting.history)
        }
      };
      
      console.log(`🔬 Deep diagnostic complete for service ${serviceId}: ${diagnostic.analysis.status}`);
      
      res.status(200).json({
        message: `Deep diagnostic completed for service ${serviceId}`,
        diagnostic
      });
      
    } catch (error) {
      console.error(`❌ Error in deep diagnostic for service ${req.params.serviceId}:`, error);
      res.status(500).json({
        error: 'Failed to run diagnostic',
        details: error.message
      });
    }
  },
  
  // Helper methods for deep analysis
  simulateSchedulerBehavior(service, today) {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const simulation = [];
    
    for (let day = 1; day <= 31; day++) {
      try {
        const testDate = new Date(currentYear, currentMonth, day);
        if (testDate.getMonth() !== currentMonth) break;
        
        const wouldTrigger = service.reminderDay === day;
        const serviceExisted = testDate >= new Date(service.createdAt);
        
        if (wouldTrigger || day === service.reminderDay) {
          simulation.push({
            day,
            date: testDate.toISOString(),
            wouldTrigger,
            serviceExisted,
            result: wouldTrigger && serviceExisted ? 'SUCCESS' : wouldTrigger ? 'MISSED_TIMING' : 'NO_TRIGGER'
          });
        }
      } catch (e) {
        // Skip invalid dates
      }
    }
    
    return simulation;
  },
  
  analyzeTimeline(service, today) {
    const createdDate = new Date(service.createdAt);
    const createdDay = createdDate.getDate();
    const reminderDay = service.reminderDay;
    const dueDay = service.dueDay;
    
    return {
      serviceCreated: {
        date: createdDate.toISOString(),
        day: createdDay
      },
      reminderDay: reminderDay,
      dueDay: dueDay,
      timing: {
        createdAfterReminder: reminderDay && createdDay > reminderDay,
        daysUntilDue: dueDay ? Math.max(0, dueDay - today.getDate()) : null,
        daysUntilReminder: reminderDay ? Math.max(0, reminderDay - today.getDate()) : null
      }
    };
  },
  
  checkConfiguration(service) {
    const issues = [];
    const recommendations = [];
    
    if (!service.reminderDay) {
      issues.push('Missing reminderDay');
      recommendations.push(`Set reminderDay to ${Math.max(1, (service.dueDay || 1) - 7)}`);
    }
    
    if (!service.designatedUser) {
      issues.push('Missing designated user');
      recommendations.push('Assign a designated user');
    }
    
    if (service.reminderDay && service.dueDay && service.reminderDay >= service.dueDay) {
      issues.push('Reminder day is after due day');
      recommendations.push('Set reminder day to be before due day');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  },
  
  analyzeHistoricalPattern(history) {
    return {
      submissionCount: history.submissions.length,
      billCount: history.bills.length,
      lastSubmission: history.submissions[0]?.createdAt || null,
      lastBill: history.bills[0]?.createdAt || null,
      hasPattern: history.submissions.length > 1,
      averageTimeBetweenSubmissions: this.calculateAverageTimeBetween(history.submissions)
    };
  },
  
  calculateAverageTimeBetween(submissions) {
    if (submissions.length < 2) return null;
    
    const times = submissions.map(s => new Date(s.createdAt).getTime());
    times.sort((a, b) => b - a); // Most recent first
    
    let totalDiff = 0;
    for (let i = 0; i < times.length - 1; i++) {
      totalDiff += times[i] - times[i + 1];
    }
    
    const averageMs = totalDiff / (times.length - 1);
    const averageDays = Math.round(averageMs / (1000 * 60 * 60 * 24));
    
    return averageDays;
  }
};

module.exports = billSubmissionMonitoringController;

