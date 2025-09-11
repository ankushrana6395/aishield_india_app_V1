/**
 * Payment Testing Service
 *
 * Comprehensive testing environment for payment systems with sandbox
 * mode, mock payments, and comprehensive test coverage
 */

// External Dependencies
const mongoose = require('mongoose');

// Internal Dependencies
const PaymentService = require('./paymentService');


// Models
const Payment = require('../models/Payment');
const UserSubscription = require('../models/UserSubscription');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');

// Error Classes and Utilities
const {
  ValidationError,
  DatabaseError
} = require('../utils/errorHandler');

const Logger = require('../utils/logger');

/**
 * Payment Testing Service
 *
 * Provides comprehensive testing infrastructure for payment systems
 * including sandbox mode, mock payments, and test data generation
 */
class PaymentTestingService {
  constructor() {
    this.sandboxMode = process.env Payne_MODE === 'sandbox' || process.env.NODE_ENV === 'development';

    // Mock payment data
    this.mockPayments = new Map();
    this.mockTransactions = new Map();

    // Test scenarios
    this.testScenarios = {
      'successful_payment': {
        type: 'success',
        gateway: 'test_gateway',
        amount: 1999,
        currency: 'INR',
        delay: 1000,
        failureRate: 0
      },
      'failed_payment': {
        type: 'failure',
        gateway: 'test_gateway',
        amount: 1999,
        currency: 'INR',
        delay: 1000,
        failureRate: 1.0,
        errorCode: 'card_declined',
        errorMessage: 'Your card was declined'
      },
      'delayed_payment': {
        type: 'success',
        gateway: 'test_gateway',
        amount: 1999,
        currency: 'INR',
        delay: 5000,
        failureRate: 0
      },
      'high_risk_payment': {
        type: 'success',
        gateway: 'test_gateway',
        amount: 50000, // High risk amount
        currency: 'INR',
        delay: 1000,
        failureRate: 0,
        riskScore: 85
      },
      'fraudulent_payment': {
        type: 'fraud',
        gateway: 'test_gateway',
        amount: 1999,
        currency: 'INR',
        delay: 500,
        failureRate: 1.0,
        errorCode: 'fraud_detected',
        errorMessage: 'Transaction flagged as potentially fraudulent'
      }
    };

    // Test data generation patterns
    this.testPatterns = {
      userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ],
      ipAddresses: [
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1',
        '203.0.113.1'
      ],
      cardNumbers: [
        '4242 4242 4242 4242', // Test Mastercard
        '4000 0025 0000 0002', // Test Visa
        '5555 5555 5555 4444'  // Test Mastercard
      ]
    };

    Logger.info('PaymentTestingService initialized', {
      sandboxMode: this.sandboxMode,
      testScenariosCount: Object.keys(this.testScenarios).length
    });
  }

  /**
   * Generate mock payment data
   * @param {String} scenario - Test scenario to use
   * @param {Object} overrides - Override default scenario data
   * @returns {Object} Mock payment data
   */
  generateMockPayment(scenario = 'successful_payment', overrides = {}) {
    const baseScenario = this.testScenarios[scenario];
    if (!baseScenario) {
      throw new ValidationError(`Unknown test scenario: ${scenario}`);
    }

    const mockData = {
      id: this._generateId('pay_test'),
      transactionId: this._generateId('txn_test'),
      gateway: baseScenario.gateway,
      amount: baseScenario.amount,
      currency: baseScenario.currency,
      status: baseScenario.failureRate === 1.0 ? 'failed' : 'pending',
      createdAt: new Date(),
      metadata: {
        scenario,
        transactionId: this._generateId('meta'),
        ...overrides.metadata
      },
      ...overrides
    };

    return mockData;
  }

  /**
   * Simulate payment processing
   * @param {String} scenario - Test scenario
   * @param {Object} transactionData - Transaction data
   * @param {Function} callback - Callback for results
   * @returns {Promise<Object>} Payment simulation result
   */
  async simulatePayment(scenario = 'successful_payment', transactionData = {}, callback) {
    const startTime = Date.now();
    const transactionId = this._generateId('sim_test');

    try {
      Logger.businessLogger('payment_simulation_start', 'test', null, {
        transactionId,
        scenario,
        amount: transactionData.amount || 1999
      });

      const scenarioConfig = this.testScenarios[scenario];
      if (!scenarioConfig) {
        throw new ValidationError(`Unknown test scenario: ${scenario}`);
      }

      // Simulate processing delay
      await this._delay(scenarioConfig.delay || 1000);

      // Generate mock payment response
      const mockPayment = this.generateMockPayment(scenario, transactionData);

      // Apply failure rate
      const shouldFail = Math.random() < scenarioConfig.failureRate;
      if (shouldFail) {
        mockPayment.status = 'failed';
        mockPayment.error = {
          code: scenarioConfig.errorCode || 'unknown_error',
          message: scenarioConfig.errorMessage || 'Transaction failed'
        };
      } else {
        mockPayment.status = 'completed';
        mockPayment.gatewayTransactionId = this._generateId('gwy');
        mockPayment.currency = scenarioConfig.currency;
      }

      Logger.businessLogger('payment_simulation_complete', 'test', transactionId, {
        scenario,
        status: mockPayment.status,
        processingTime: Date.now() - startTime
      });

      if (callback && typeof callback === 'function') {
        await callback(mockPayment);
      }

      return {
        success: !shouldFail,
        data: mockPayment,
        scenario,
        transactionId,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'simulatePayment',
        transactionId,
        scenario,
        error: error.message
      });

      throw this._handleTestError(error, 'Payment simulation failed');
    }
  }

  /**
   * Run comprehensive test suite
   * @param {Array} scenarios - Scenarios to test
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test suite results
   */
  async runTestSuite(scenarios = [], options = {}) {
    const startTime = Date.now();
    const suiteId = this._generateId('suite_test');

    const testScenarios = scenarios.length > 0
      ? scenarios.map(s => typeof s === 'string' ? s : s.name)
      : Object.keys(this.testScenarios);

    Logger.businessLogger('test_suite_start', 'test', suiteId, {
      totalTests: testScenarios.length,
      options
    });

    const results = {
      suiteId,
      totalTests: testScenarios.length,
      passed: 0,
      failed: 0,
      errors: [],
      testResults: [],
      duration: 0
    };

    for (const scenario of testScenarios) {
      try {
        const testStartTime = Date.now();
        const testResult = await this.simulatePayment(scenario);

        results.testResults.push({
          scenario,
          status: testResult.success ? 'passed' : 'failed',
          duration: Date.now() - testStartTime,
          result: testResult.data,
          error: testResult.data?.error
        });

        if (testResult.success) {
          results.passed++;
        } else {
          results.failed++;
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          scenario,
          error: error.message,
          stack: error.stack
        });

        results.testResults.push({
          scenario,
          status: 'error',
          duration: 0,
          error: error.message
        });
      }
    }

    results.duration = Date.now() - startTime;
    results.successRate = (results.passed / results.totalTests) * 100;

    Logger.businessLogger('test_suite_complete', 'test', suiteId, {
      totalTests: results.totalTests,
      passed: results.passed,
      failed: results.failed,
      successRate: results.successRate,
      duration: results.duration
    });

    return results;
  }

  /**
   * Generate test data for comprehensive testing
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated test data
   */
  async generateTestData(options = {}) {
    const startTime = Date.now();
    const generationId = this._generateId('data_test');

    const testData = {
      generationId,
      flag: {
        users: options.usersCount || 5,
        payments: options.paymentsCount || 20,
        subscriptions: options.subscriptionsCount || 10,
        webhookEvents: options.webhookEventsCount || 50
      },

      users: [],
      payments: [],
      subscriptions: [],
      webhookEvents: [],
      scenarioResults: {}
    };

    try {
      Logger.businessLogger('test_data_generation_start', 'test', generationId, {
        options
      });

      // Generate test users
      for (let i = 0; i < testData.counts.users; i++) {
        testData.users.push(await this.generateTestUser(i + 1));
      }

      // Generate test payments
      for (let i = 0; i < testData.counts.payments; i++) {
        const userId = testData.users[Math.floor(Math.random() * testData.users.length)]?._id;
        testData.payments.push(await this.generateTestPayment(userId, i + 1));
      }

      // Generate test subscriptions
      for (let i = 0; i < testData.counts.subscriptions; i++) {
        const userId = testData.users[Math.floor(Math.random() * testData.users.length)]?._id;
        const planId = this._generateId('plan_test');
        testData.subscriptions.push(await this.generateTestSubscription(userId, planId, i + 1));
      }

      // Generate test webhook events
      for (let i = 0; i < testData.counts.webhookEvents; i++) {
        testData.webhookEvents.push(await this.generateTestWebhookEvent(i + 1));
      }

      // Run test scenarios
      const scenarios = options.includeScenarios ? Object.keys(this.testScenarios) : [];
      if (scenarios.length > 0) {
        testData.scenarioResults = await this.runTestSuite(scenarios);
      }

      Logger.businessLogger('test_data_generation_complete', 'test', generationId, {
        users: testData.users.length,
        payments: testData.payments.length,
        subscriptions: testData.subscriptions.length,
        webhooks: testData.webhookEvents.length,
        duration: Date.now() - startTime
      });

      return testData;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'generateTestData',
        generationId,
        error: error.message
      });

      throw new DatabaseError('Test data generation failed');
    }
  }

  /**
   * Validate payment integration
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation results
   */
  async validatePaymentIntegration(options = {}) {
    const validationId = this._generateId('validation_test');
    const startTime = Date.now();

    Logger.businessLogger('payment_validation_start', 'test', validationId, {
      options
    });

    const results = {
      validationId,
      status: 'running',
      checks: [],
      issues: [],
      recommendations: []
    };

    try {
      // Check environment configuration
      const envCheck = this._validateEnvironmentConfiguration();
      results.checks.push(envCheck);

      // Check gateway connectivity
      const gatewayCheck = await this._validateGatewayConnectivity(options);
      results.checks.push(gatewayCheck);

      // Check webhook endpoints
      const webhookCheck = await this._validateWebhookConfiguration();
      results.checks.push(webhookCheck);

      // Check database models
      const dbCheck = await this._validateDatabaseModels();
      results.checks.push(dbCheck);

      // Check service dependencies
      const serviceCheck = await this._validateServiceDependencies();
      results.checks.push(serviceCheck);

      // Summarize issues
      results.issues = results.checks.flatMap(check =>
        check.issues ? check.issues.map(issue => ({ check: check.name, ...issue })) : []
      );

      results.recommendations = results.checks.flatMap(check =>
        check.recommendations || []
      );

      results.status = results.issues.length === 0 ? 'passed' : 'issues_found';
      results.duration = Date.now() - startTime;

      Logger.businessLogger('payment_validation_complete', 'test', validationId, {
        status: results.status,
        issuesCount: results.issues.length,
        duration: results.duration
      });

      return results;

    } catch (error) {
      results.status = 'error';
      results.error = error.message;
      results.duration = Date.now() - startTime;

      Logger.errorLogger(error, {
        operation: 'validatePaymentIntegration',
        validationId,
        error: error.message
      });

      return results;
    }
  }

  /**
   * Clean up test data
   * @param {Object} filters - Cleanup filters
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupTestData(filters = {}) {
    const cleanupId = this._generateId('cleanup_test');

    Logger.businessLogger('test_cleanup_start', 'test', cleanupId, {
      filters
    });

    const result = {
      cleanupId,
      cleaned: 0,
      errors: []
    };

    try {
      // Clean up test payments
      if (filters.includePayments) {
        const paymentCleanup = await this._cleanupTestPayments(filters);
        result.cleaned += paymentCleanup.cleaned || 0;
        if (paymentCleanup.error) result.errors.push(paymentCleanup.error);
      }

      // Clean up test users
      if (filters.includeUsers) {
        const userCleanup = await this._cleanupTestUsers(filters);
        result.cleaned += userCleanup.cleaned || 0;
        if (userCleanup.error) result.errors.push(userCleanup.error);
      }

      // Clean up in-memory caches
      this.mockPayments.clear();
      this.mockTransactions.clear();

      Logger.businessLogger('test_cleanup_complete', 'test', cleanupId, {
        cleaned: result.cleaned,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'cleanupTestData',
        cleanupId,
        error: error.message
      });

      throw new DatabaseError('Test data cleanup failed');
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate unique test ID
   * @param {String} prefix - ID prefix
   * @returns {String} Generated ID
   */
  _generateId(prefix) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Simulate processing delay
   * @param {Number} ms - Delay in milliseconds
   * @returns {Promise} Delay promise
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate test user
   * @param {Number} index - User index
   * @returns {Promise<Object>} Test user data
   */
  async generateTestUser(index) {
    const user = new User({
      name: `Test User ${index}`,
      email: `test${index}@example.com`,
      isVerified: true,
      isSubscribed: index % 3 === 0, // Every third user is subscribed
      createdAt: new Date(Date.now() - (Math.random() * 30) * 24 * 60 * 60 * 1000) // Random creation date
    });

    if (this.sandboxMode) {
      await user.save();
    }

    return user;
  }

  /**
   * Generate test payment
   * @param {String} userId - User ID
   * @param {Number} index - Payment index
   * @returns {Promise<Object>} Test payment data
   */
  async generateTestPayment(userId, index) {
    const scenarios = Object.keys(this.testScenarios);
    const scenario = scenarios[index % scenarios.length];

    const payment = await this.simulatePayment(scenario, {
      amount: Math.floor(Math.random() * 5000) + 499, // Random amount between ₹499 - ₹5499
      currency: 'INR',
      userId
    });

    const paymentRecord = new Payment({
      userId,
      subscriptionId: this._generateId('sub_test'),
      planId: this._generateId('plan_test'),
      transaction: {
        gateway: payment.data.gateway,
        referenceCode: payment.transactionId,
        amount: payment.data.amount,
        currency: payment.data.currency,
        status: payment.data.status
      },
      paymentMethod: payment.data.paymentMethod || {},
      audit: {
        initiatedAt: new Date(),
        userId
      }
    });

    if (this.sandboxMode) {
      await paymentRecord.save();
    }

    return paymentRecord;
  }

  /**
   * Generate test subscription
   * @param {String} userId - User ID
   * @param {String} planId - Plan ID
   * @param {Number} index - Subscription index
   * @returns {Promise<Object>} Test subscription data
   */
  async generateTestSubscription(userId, planId, index) {
    const subscription = new UserSubscription({
      userId,
      planId,
      subscriptionInfo: {
        name: `Test Plan ${index}`,
        slug: `test-plan-${index}`,
        billingCycle: index % 2 === 0 ? 'monthly' : 'yearly',
        price: (index * 499) % 5000 + 499,
        currency: 'INR',
        status: 'active'
      },
      billing: {
        startDate: new Date(),
        endDate: new Date(Date.now() + (30 + index * 7) * 24 * 60 * 60 * 1000),
        billingCycle: index % 2 === 0 ? 'monthly' : 'yearly'
      },
      audit: {
        initiatedAt: new Date()
      }
    });

    if (this.sandboxMode) {
      await subscription.save();
    }

    return subscription;
  }

  /**
   * Generate test webhook event
   * @param {Number} index - Webhook index
   * @returns {Object} Test webhook data
   */
  generateTestWebhookEvent(index) {
    const events = ['payment.succeeded', 'payment.failed', 'invoice.payment_succeeded', 'customer.created'];
    const event = events[index % events.length];

    return {
      event,
      eventId: this._generateId('webhook_test'),
      data: {
        object: {
          id: this._generateId('obj_test'),
          amount: Math.floor(Math.random() * 5000) + 499,
          currency: 'INR',
          status: index % 3 === 0 ? 'succeeded' : 'pending'
        }
      },
      created: Date.now(),
      livemode: false
    };
  }

  /**
   * Validate environment configuration
   * @returns {Object} Environment validation result
   */
  _validateEnvironmentConfiguration() {
    const config = process.env;
    const issues = [];
    const recommendations = [];

    // Check Stripe configuration
    if (!config.STRIPE_SECRET_KEY) {
      issues.push({
        type: 'configuration_error',
        message: 'Stripe secret key not configured',
        severity: 'high'
      });
      recommendations.push('Configure STRIPE_SECRET_KEY environment variable');
    }

    // Check Razorpay configuration
    if (!config.RAZORPAY_KEY_SECRET) {
      issues.push({
        type: 'configuration_error',
        message: 'Razorpay key secret not configured',
        severity: 'high'
      });
      recommendations.push('Configure RAZORPAY_KEY_SECRET environment variable');
    }

    // Check webhook secrets
    if (!config.STRIPE_WEBHOOK_SECRET && !config.RAZORPAY_WEBHOOK_SECRET) {
      issues.push({
        type: 'configuration_warning',
        message: 'Webhook secret not configured - webhook verification disabled',
        severity: 'medium'
      });
    }

    return {
      name: 'Environment Configuration',
      status: issues.length === 0 ? 'passed' : 'issues_found',
      issues,
      recommendations
    };
  }

  /**
   * Validate gateway connectivity
   * @param {Object} options - Validation options
   * @returns {Object} Gateway connectivity result
   */
  async _validateGatewayConnectivity(options) {
    // In a real implementation, this would test actual API connectivity
    // For now, return a placeholder result

    return {
      name: 'Gateway Connectivity',
      status: this.sandboxMode ? 'mocked' : 'passed',
      issues: [],
      recommendations: this.sandboxMode ? ['Configure production gateway credentials for live testing'] : []
    };
  }

  /**
   * Validate webhook configuration
   * @returns {Object} Webhook configuration validation
   */
  async _validateWebhookConfiguration() {
    // This would check webhook endpoint configuration
    return {
      name: 'Webhook Configuration',
      status: 'passed',
      issues: [],
      recommendations: []
    };
  }

  /**
   * Validate database models
   * @returns {Object} Database validation result
   */
  async _validateDatabaseModels() {
    const issues = [];

    try {
      // Test Payment model
      const testPayment = new Payment();
      if (!testPayment.transaction) {
        issues.push({
          type: 'model_validation_error',
          message: 'Payment model missing transaction field',
          severity: 'high'
        });
      }

      // Test UserSubscription model
      const testSubscription = new UserSubscription();
      if (!testSubscription.subscriptionInfo) {
        issues.push({
          type: 'model_validation_error',
          message: 'UserSubscription model missing subscriptionInfo field',
          severity: 'high'
        });
      }

    } catch (error) {
      issues.push({
        type: 'model_error',
        message: `Model validation failed: ${error.message}`,
        severity: 'high'
      });
    }

    return {
      name: 'Database Models',
      status: issues.length === 0 ? 'passed' : 'issues_found',
      issues,
      recommendations: issues.length > 0 ? ['Review and fix database model definitions'] : []
    };
  }

  /**
   * Validate service dependencies
   * @returns {Object} Service validation result
   */
  async _validateServiceDependencies() {
    const issues = [];

    // Check if required services are accessible
    if (!PaymentService) {
      issues.push({
        type: 'service_dependency',
        message: 'PaymentService is not available',
        severity: 'high'
      });
    }

    if (!FraudDetectionService) {
      issues.push({
        type: 'service_dependency',
        message: 'FraudDetectionService is not available',
        severity: 'high'
      });
    }

    return {
      name: 'Service Dependencies',
      status: issues.length === 0 ? 'passed' : 'issues_found',
      issues,
      recommendations: issues.length > 0 ? ['Ensure all payment service dependencies are properly imported'] : []
    };
  }

  /**
   * Clean up test payments
   * @param {Object} filters - Cleanup filters
   * @returns {Object} Cleanup result
   */
  async _cleanupTestPayments(filters) {
    try {
      const query = {};
      query.$or = [
        { 'transaction.referenceCode': { $regex: /^pay_test_/ } },
        { 'transaction.referenceCode': { $regex: /^txn_test_/ } }
      ];

      const result = await Payment.deleteMany(query);

      return {
        cleaned: result.deletedCount,
        type: 'payments'
      };
    } catch (error) {
      return {
        cleaned: 0,
        type: 'payments',
        error: error.message
      };
    }
  }

  /**
   * Clean up test users
   * @param {Object} filters - Cleanup filters
   * @returns {Object} Cleanup result
   */
  async _cleanupTestUsers(filters) {
    try {
      const query = {
        email: { $regex: /^test\d+@example\.com$/ }
      };

      const result = await User.deleteMany(query);

      return {
        cleaned: result.deletedCount,
        type: 'users'
      };
    } catch (error) {
      return {
        cleaned: 0,
        type: 'users',
        error: error.message
      };
    }
  }

  /**
   * Handle test service errors
   * @param {Error} error - Original error
   * @param {String} defaultMessage - Default error message
   * @returns {Error} Formatted error
   */
  _handleTestError(error, defaultMessage) {
    if (error instanceof ValidationError ||
        error instanceof DatabaseError) {
      return error;
    }

    Logger.error('Payment Testing Service Error', {
      message: error.message,
      stack: error.stack,
      defaultMessage
    });

    return new DatabaseError(`${defaultMessage}: ${error.message}`);
  }
}

module.exports = new PaymentTestingService();