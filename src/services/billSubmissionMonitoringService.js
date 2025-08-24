// src/services/billSubmissionMonitoringService.js

const { HouseService, BillSubmission, Bill, User } = require('../models');
const { Op } = require('sequelize');

/**
 * BILL SUBMISSION MONITORING SERVICE
 * 
 * This service provides comprehensive monitoring and diagnostics
 * for variable recurring services to prevent missed bill submissions.
 */

class BillSubmissionMonitoringService {
  
  /**
   * Get a comprehensive health report for all variable recurring services
   */
  async getHealthReport() {
    try {
      const today = new Date();
      const currentDay = today.getDate();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Get all variable recurring services
      const allServices = await HouseService.findAll({
        where: {
          type: 'variable_recurring',
          status: 'active'
        },
        include: [{
          model: User,
          as: 'designatedUser',
          attributes: ['id', 'username', 'email']
        }],
        order: [['id', 'ASC']]
      });
      
      const report = {
        timestamp: today.toISOString(),
        totalServices: allServices.length,
        summary: {
          healthy: 0,
          needsAttention: 0,
          critical: 0
        },
        issues: {
          missingReminderDay: [],
          missingDesignatedUser: [],
          missedSubmissions: [],
          overdueBills: [],
          configurationIssues: [],
          potentialTimingGaps: []
        },
        services: []
      };
      
      for (const service of allServices) {
        const serviceAnalysis = await this.analyzeService(service, today, firstDayOfMonth);
        report.services.push(serviceAnalysis);
        
        // Categorize service health
        if (serviceAnalysis.issues.length === 0) {
          report.summary.healthy++;
        } else if (serviceAnalysis.issues.some(issue => issue.severity === 'critical')) {
          report.summary.critical++;
        } else {
          report.summary.needsAttention++;
        }
        
        // Collect issues by type
        serviceAnalysis.issues.forEach(issue => {
          switch (issue.type) {
            case 'missing_reminder_day':
              report.issues.missingReminderDay.push(serviceAnalysis);
              break;
            case 'missing_designated_user':
              report.issues.missingDesignatedUser.push(serviceAnalysis);
              break;
            case 'missed_submission':
              report.issues.missedSubmissions.push(serviceAnalysis);
              break;
            case 'overdue_bill':
              report.issues.overdueBills.push(serviceAnalysis);
              break;
            case 'configuration':
              report.issues.configurationIssues.push(serviceAnalysis);
              break;
            case 'potential_timing_gap':
              report.issues.potentialTimingGaps.push(serviceAnalysis);
              break;
          }
        });
      }
      
      return report;
      
    } catch (error) {
      console.error('Error generating health report:', error);
      throw error;
    }
  }
  
  /**
   * Analyze a specific service for issues
   */
  async analyzeService(service, today = new Date(), firstDayOfMonth = null) {
    if (!firstDayOfMonth) {
      firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    
    const analysis = {
      serviceId: service.id,
      serviceName: service.name,
      houseId: service.houseId,
      dueDay: service.dueDay,
      reminderDay: service.reminderDay,
      designatedUser: service.designatedUser ? {
        id: service.designatedUser.id,
        username: service.designatedUser.username
      } : null,
      createdAt: service.createdAt,
      status: 'healthy',
      issues: [],
      recommendations: []
    };
    
    // Check for missing reminderDay
    if (!service.reminderDay) {
      analysis.issues.push({
        type: 'missing_reminder_day',
        severity: 'critical',
        message: 'No reminderDay set - scheduler will never create bill submissions',
        details: `Service has dueDay ${service.dueDay} but no reminderDay`
      });
      
      const suggestedReminderDay = Math.max(1, Math.min(31, (service.dueDay || 1) - 7));
      analysis.recommendations.push(`Set reminderDay to ${suggestedReminderDay} (7 days before due)`);
    }
    
    // Check for missing designated user
    if (!service.designatedUser) {
      analysis.issues.push({
        type: 'missing_designated_user',
        severity: 'critical',
        message: 'No designated user - scheduler will skip this service',
        details: 'Service needs a designated user to create bill submissions'
      });
      
      analysis.recommendations.push('Assign a designated user to this service');
    }
    
    // Check if service was created after reminder day this month
    const createdThisMonth = service.createdAt >= firstDayOfMonth;
    const createdDay = new Date(service.createdAt).getDate();
    
    if (createdThisMonth && service.reminderDay && createdDay > service.reminderDay) {
      analysis.issues.push({
        type: 'potential_timing_gap',
        severity: 'warning',
        message: 'Service created after reminder day - may need manual bill submission',
        details: `Created on day ${createdDay}, reminder day is ${service.reminderDay}`
      });
      
      analysis.recommendations.push('Check if bill submission is needed for this month, create manually if required');
    }
    
    // Check for existing submissions and bills this month
    const [existingSubmission, existingBill] = await Promise.all([
      BillSubmission.findOne({
        where: {
          houseServiceId: service.id,
          createdAt: { [Op.gte]: firstDayOfMonth }
        }
      }),
      Bill.findOne({
        where: {
          houseService_id: service.id,
          billType: 'variable_recurring',
          createdAt: { [Op.gte]: firstDayOfMonth }
        }
      })
    ]);
    
    analysis.hasSubmissionThisMonth = !!existingSubmission;
    analysis.hasBillThisMonth = !!existingBill;
    
    // Check if we should have a submission by now
    const currentDay = today.getDate();
    const shouldHaveSubmission = service.reminderDay && currentDay >= service.reminderDay;
    
    if (shouldHaveSubmission && !existingSubmission && !existingBill) {
      analysis.issues.push({
        type: 'missed_submission',
        severity: 'critical',
        message: 'Missing bill submission - past reminder day but no submission created',
        details: `Today is day ${currentDay}, reminder day was ${service.reminderDay}`
      });
      
      analysis.recommendations.push('Run safeguard check immediately to create missing submission');
    }
    
    // Check for overdue bills
    if (existingBill) {
      const dueDate = new Date(existingBill.dueDate);
      if (today > dueDate && existingBill.status !== 'paid') {
        analysis.issues.push({
          type: 'overdue_bill',
          severity: 'high',
          message: 'Bill is overdue',
          details: `Bill ${existingBill.id} was due ${dueDate.toISOString()}`
        });
      }
    }
    
    // Set overall status
    if (analysis.issues.length === 0) {
      analysis.status = 'healthy';
    } else if (analysis.issues.some(issue => issue.severity === 'critical')) {
      analysis.status = 'critical';
    } else {
      analysis.status = 'needs_attention';
    }
    
    return analysis;
  }
  
  /**
   * Get services that need immediate attention
   */
  async getCriticalIssues() {
    const report = await this.getHealthReport();
    
    return {
      timestamp: report.timestamp,
      criticalCount: report.summary.critical,
      criticalServices: report.services.filter(s => s.status === 'critical'),
      missedSubmissions: report.issues.missedSubmissions.filter(s => 
        s.issues.some(i => i.severity === 'critical')
      ),
      missingConfig: [
        ...report.issues.missingReminderDay,
        ...report.issues.missingDesignatedUser
      ]
    };
  }
  
  /**
   * Generate a troubleshooting guide for a specific service
   */
  async troubleshootService(serviceId) {
    const service = await HouseService.findByPk(serviceId, {
      include: [{
        model: User,
        as: 'designatedUser',
        attributes: ['id', 'username', 'email']
      }]
    });
    
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }
    
    const analysis = await this.analyzeService(service);
    
    // Get historical data
    const [submissions, bills] = await Promise.all([
      BillSubmission.findAll({
        where: { houseServiceId: serviceId },
        order: [['createdAt', 'DESC']],
        limit: 10
      }),
      Bill.findAll({
        where: { houseService_id: serviceId },
        order: [['createdAt', 'DESC']],
        limit: 10
      })
    ]);
    
    return {
      service: {
        id: service.id,
        name: service.name,
        type: service.type,
        status: service.status,
        dueDay: service.dueDay,
        reminderDay: service.reminderDay,
        createdAt: service.createdAt,
        designatedUser: analysis.designatedUser
      },
      analysis,
      history: {
        submissions: submissions.map(s => ({
          id: s.id,
          status: s.status,
          dueDate: s.dueDate,
          createdAt: s.createdAt
        })),
        bills: bills.map(b => ({
          id: b.id,
          status: b.status,
          amount: b.amount,
          dueDate: b.dueDate,
          createdAt: b.createdAt
        }))
      },
      troubleshooting: {
        possibleCauses: this.identifyPossibleCauses(analysis),
        nextSteps: this.generateNextSteps(analysis),
        preventionMeasures: this.generatePreventionMeasures(analysis)
      }
    };
  }
  
  identifyPossibleCauses(analysis) {
    const causes = [];
    
    analysis.issues.forEach(issue => {
      switch (issue.type) {
        case 'missing_reminder_day':
          causes.push('Service configuration incomplete - no reminderDay set');
          break;
        case 'missing_designated_user':
          causes.push('Service configuration incomplete - no designated user assigned');
          break;
        case 'missed_submission':
          causes.push('Timing issue - service created after scheduler ran, or scheduler missed the service');
          break;
        case 'overdue_bill':
          causes.push('User did not submit bill amount or payment processing failed');
          break;
      }
    });
    
    if (causes.length === 0) {
      causes.push('No obvious issues detected - may be a rare edge case or timing issue');
    }
    
    return causes;
  }
  
  generateNextSteps(analysis) {
    const steps = [];
    
    if (analysis.issues.some(i => i.type === 'missing_reminder_day')) {
      steps.push('1. Set reminderDay field for the service');
    }
    
    if (analysis.issues.some(i => i.type === 'missing_designated_user')) {
      steps.push('2. Assign a designated user to the service');
    }
    
    if (analysis.issues.some(i => i.type === 'missed_submission')) {
      steps.push('3. Run safeguard check: POST /api/bills/check-missing-submissions');
      steps.push('4. If needed, manually create bill submission');
    }
    
    steps.push('5. Monitor service for next billing cycle');
    steps.push('6. Verify scheduler is running properly');
    
    return steps;
  }
  
  generatePreventionMeasures(analysis) {
    return [
      'Ensure all variable_recurring services have reminderDay set',
      'Ensure all services have designated users assigned',
      'Run daily safeguard checks to catch missed submissions',
      'Monitor service creation timing vs reminder days',
      'Set up alerts for critical service configuration issues',
      'Regular health checks on all variable recurring services'
    ];
  }
}

module.exports = new BillSubmissionMonitoringService();
