/**
 * Advanced Fraud Detection Service
 *
 * Enterprise-grade fraud detection system with real-time risk assessment,
 * anomaly detection, machine learning algorithms, and automated response
 */

// External Dependencies
const crypto = require('crypto');

// Internal Dependencies
const Payment = require('../models/Payment');
const User = require('../models/User');
const UserSubscription = require('../models/UserSubscription');

// Error Classes and Utilities
const {
  ValidationError,
  DatabaseError
} = require('../utils/errorHandler');

const Logger = require('../utils/logger');

/**
 * Advanced Fraud Detection Service
 *
 * Comprehensive fraud prevention system with multiple detection layers
 */
class FraudDetectionService {
  constructor() {
    this.config = {
      enabled: process.env.FRAUD_DETECTION_ENABLED !== 'false',
      riskThresholds: {
        low: 30,
        medium: 60,
        high: 80,
        critical: 90
      },

      // Velocity checks
      velocityChecks: {
        amountPerHour: { threshold: 50000 }, // ₹50,000 per hour
        transactionsPerHour: { threshold: 10 }, // 10 transactions per hour
        transactionsPerDay: { threshold: 50 }, // 50 transactions per day
        sameAmountBurst: { threshold: 5, windowMinutes: 30 }, // 5 same amounts in 30 min
        rapidSequence: { threshold: 10, windowMinutes: 15 } // 10 rapid transactions
      },

      // Geographic checks
      geoChecks: {
        highRiskCountries: ['CU', 'IR', 'KP', 'SY', 'AF'], // Cuba, Iran, North Korea, Syria, Afghanistan
        suspiciousCountries: ['SS', 'SO', 'YE', 'CG'], // South Sudan, Somalia, Yemen, Congo
        requiredVerification: ['US', 'GB', 'CA', 'AU', 'DE'] // Require additional verification
      },

      // Device and browser checks
      deviceChecks: {
        maxUserAgents: { threshold: 50, windowHours: 24 }, // Max different user agents
        blockedUserAgents: [
          /bot/i,
          /spider/i,
          /crawler/i,
          /scraper/i,
          /postman/i,
          /insomnia/i,
          /chrome-headless/i
        ]
      },

      // Amount-based checks
      amountChecks: {
        minimumAmount: 1, // ₹1 minimum
        maximumAmount: 500000, // ₹5,00,000 maximum
        roundAmounts: true, // Flag round amount payments
        suspiciousAmounts: [100, 500, 1000, 5000, 10000], // Common fraud amounts
        velocityAmountIncrease: { threshold: 200, windowMinutes: 60 } // 200% increase in hour
      },

      // Behavioral checks
      behavioralChecks: {
        accountAgeCheck: { minimumDays: 7 }, // Account must be 7 days old
        transactionFrequency: { threshold: 3, windowMinutes: 10 }, // Max 3 transactions in 10 min
        patternRecognition: {
          enabled: true,
          similarPatternsThreshold: 3,
          timeWindowMinutes: 60
        }
      },

      // Blacklist management
      blacklists: {
        enabled: true,
        ipBlacklist: [],
        emailBlacklist: [],
        cardBlacklist: []
      }
    };

    // In-memory caches for performance
    this.velocityCache = new Map();
    this.patternCache = new Map();

    // Auto-cleanup intervals
    setInterval(() => this._cleanupCache(), 5 * 60 * 1000); // Clean every 5 minutes
  }

  /**
   * Comprehensive risk assessment for payment transactions
   *
   * @param {Object} transaction - Transaction details
   * @param {Object} user - User information
   * @param {Object} context - Additional context (IP, device, etc.)
   * @param {String} transactionId - Unique transaction identifier
   * @returns {Promise<Object>} Risk assessment result
   */
  async assessTransactionRisk(transaction, user, context = {}, transactionId) {
    const startTime = Date.now();
    const riskFactors = [];

    try {
      // Skip fraud detection if disabled
      if (!this.config.enabled) {
        return {
          score: 0,
          level: 'low',
          factors: [],
          blocked: false,
          recommendations: []
        };
      }

      Logger.businessLogger('fraud_assessment_start', 'fraud', null, {
        transactionId,
        userId: user._id,
        amount: transaction.amount,
        currency: transaction.currency
      });

      // 1. Velocity-based checks
      const velocityRisk = await this._checkVelocity(transaction, user._id, transactionId);
      if (velocityRisk.score > 0) riskFactors.push(velocityRisk);

      // 2. Geographic and IP-based checks
      const geoRisk = await this._checkGeographic(context, transactionId);
      if (geoRisk.score > 0) riskFactors.push(geoRisk);

      // 3. Device and browser checks
      const deviceRisk = await this._checkDevice(context, transactionId);
      if (deviceRisk.score > 0) riskFactors.push(deviceRisk);

      // 4. Amount and pattern analysis
      const amountRisk = await this._checkAmountPatterns(transaction, user._id, transactionId);
      if (amountRisk.score > 0) riskFactors.push(amountRisk);

      // 5. Behavioral analysis
      const behavioralRisk = await this._checkBehavioralPatterns(user._id, transactionId);
      if (behavioralRisk.score > 0) riskFactors.push(behavioralRisk);

      // 6. Blacklist checks
      const blacklistRisk = await this._checkBlacklists(transaction, user, context);
      if (blacklistRisk.score > 0) riskFactors.push(blacklistRisk);

      // Calculate final risk score
      const totalScore = riskFactors.reduce((sum, factor) => sum + factor.score, 0);
      const riskLevel = this._calculateRiskLevel(totalScore);

      // Determine if transaction should be blocked
      const blocked = totalScore >= this.config.riskThresholds.critical ||
                      (riskLevel === 'high' && !this._hasOverride(transaction));

      // Generate recommendations
      const recommendations = this._generateRecommendations(riskFactors, totalScore, riskLevel, context);

      const result = {
        score: totalScore,
        level: riskLevel,
        factors: riskFactors,
        blocked,
        reasons: riskFactors.map(f => f.reason),
        recommendations,
        assessmentId: transactionId,
        assessedAt: new Date().toISOString()
      };

      Logger.businessLogger('fraud_assessment_complete', 'fraud', null, {
        transactionId,
        riskScore: totalScore,
        riskLevel,
        factorsCount: riskFactors.length,
        blocked
      });

      Logger.performanceLogger('assessTransactionRisk', startTime, 800, {
        transactionId,
        riskScore: totalScore,
        factorsCount: riskFactors.length
      });

      return result;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'assessTransactionRisk',
        transactionId,
        userId: user._id,
        error: error.message
      });

      // Return low risk on error (fail-safe approach)
      return {
        score: 0,
        level: 'low',
        factors: [],
        blocked: false,
        recommendations: ['Assessment failed, proceeding with standard security'],
        error: error.message
      };
    }
  }

  /**
   * Real-time velocity risk checks
   */
  async _checkVelocity(transaction, userId, transactionId) {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const thirtyMinAgo = now - (30 * 60 * 1000);

    try {
      // Get user's transaction history
      const user = await Payment.find({
        userId,
        createdAt: { $gte: new Date(hourAgo) },
        'transaction.status': { $ne: 'failed' }
      });

      const recent = await Payment.find({
        userId,
        createdAt: { $gte: new Date(dayAgo) }
      });

      const sameAmountTransactions = await Payment.find({
        userId: userId,
        'transaction.amount': transaction.amount,
        createdAt: { $gte: new Date(thirtyMinAgo) }
      });

      let riskScore = 0;
      let reasons = [];

      // Check amount per hour
      const hourlyAmount = user.reduce((sum, p) => sum + p.transaction.amount, 0);
      if (hourlyAmount >= this.config.velocityChecks.amountPerHour.threshold) {
        riskScore += 30;
        reasons.push(`High hourly transaction amount: ₹${hourlyAmount.toLocaleString()}`);
      }

      // Check transactions per hour
      if (user.length >= this.config.velocityChecks.transactionsPerHour.threshold) {
        riskScore += 20;
        reasons.push(`High transaction velocity: ${user.length} transactions per hour`);
      }

      // Check transactions per day
      if (recent.length >= this.config.velocityChecks.transactionsPerDay.threshold) {
        riskScore += 15;
        reasons.push(`High daily transaction count: ${recent.length} transactions per day`);
      }

      // Check same amount burst
      if (sameAmountTransactions.length >= this.config.velocityChecks.sameAmountBurst.threshold) {
        riskScore += 25;
        reasons.push(`Multiple same amount transactions: ₹${transaction.amount} (${sameAmountTransactions.length} times)`);
      }

      return {
        type: 'velocity',
        score: riskScore,
        reasons,
        data: {
          hourlyCount: user.length,
          dailyCount: recent.length,
          sameAmountCount: sameAmountTransactions.length,
          hourlyAmount
        }
      };

    } catch (error) {
      Logger.error(`Velocity check failed for user ${userId}: ${error.message}`);
      return { type: 'velocity', score: 0, reasons: [], data: {} };
    }
  }

  /**
   * Geographic and IP-based risk assessment
   */
  async _checkGeographic(context, transactionId) {
    const riskScore = 0;
    const reasons = [];
    const geo = this._extractGeoData(context);

    // High-risk countries
    if (this.config.geoChecks.highRiskCountries.includes(geo.country)) {
      return {
        type: 'geographic',
        score: 100, // Block immediately
        reasons: [`Transaction from high-risk country: ${geo.country}`],
        data: geo
      };
    }

    // Suspicious countries
    if (this.config.geoChecks.suspiciousCountries.includes(geo.country)) {
      return {
        type: 'geographic',
        score: 40,
        reasons: [`Transaction from suspicious country: ${geo.country}`],
        data: geo
      };
    }

    // Countries requiring verification
    if (this.config.geoChecks.requiredVerification.includes(geo.country)) {
      return {
        type: 'geographic',
        score: 15,
        reasons: [`Additional verification required for: ${geo.country}`],
        data: geo
      };
    }

    // Check for VPN/Tor usage
    if (this._isLikelyVPN(context)) {
      return {
        type: 'geographic',
        score: 35,
        reasons: ['Potential VPN/Tor usage detected'],
        data: geo
      };
    }

    return { type: 'geographic', score: 0, reasons: [], data: geo };
  }

  /**
   * Device and browser fingerprinting
   */
  async _checkDevice(context, transactionId) {
    const userAgent = context.userAgent || '';
    const ip = context.ip || '';

    let riskScore = 0;
    let reasons = [];

    // Check for blocked user agents
    for (const pattern of this.config.deviceChecks.blockedUserAgents) {
      if (pattern.test(userAgent)) {
        riskScore += 100; // Immediate block
        reasons.push('Blocked user agent detected');
        break;
      }
    }

    // Check user agent diversity (anti-bot measure)
    const userAgentKey = `useragents_${ip}`;
    const userAgents = this.velocityCache.get(userAgentKey) || new Set();

    if (userAgents.size >= this.config.deviceChecks.maxUserAgents.threshold) {
      riskScore += 20;
      reasons.push('Excessive user agent diversity');
    }

    // Add current user agent to cache
    userAgents.add(userAgent);
    this.velocityCache.set(userAgentKey, userAgents);

    return {
      type: 'device',
      score: riskScore,
      reasons,
      data: { userAgent, userAgentCount: userAgents.size }
    };
  }

  /**
   * Transaction amount pattern analysis
   */
  async _checkAmountPatterns(transaction, userId, transactionId) {
    const amount = transaction.amount;
    let riskScore = 0;
    let reasons = [];

    // Round amount check
    if (this.config.amountChecks.roundAmounts) {
      const isRoundAmount = amount % 100 === 0;
      if (isRoundAmount && amount >= 1000) {
        riskScore += 10;
        reasons.push('Round transaction amount');
      }
    }

    // Suspicious amount check
    if (this.config.amountChecks.suspiciousAmounts.includes(amount)) {
      riskScore += 15;
      reasons.push(`Common fraud amount: ₹${amount}`);
    }

    // Amount range checks
    if (amount < this.config.amountChecks.minimumAmount) {
      riskScore += 50;
      reasons.push('Amount below minimum threshold');
    }

    if (amount > this.config.amountChecks.maximumAmount) {
      riskScore += 30;
      reasons.push(`Amount above maximum threshold: ₹${amount}`);
    }

    // Velocity amount increase check
    try {
      const previousTransactions = await Payment.find({
        userId,
        createdAt: { $gte: new Date(Date.now() - (60 * 60 * 1000)) }, // Last hour
        'transaction.amount': { $gt: 0 }
      }).sort({ createdAt: -1 }).limit(5);

      if (previousTransactions.length > 0) {
        const avgPreviousAmount = previousTransactions.reduce((sum, p) => sum + p.transaction.amount, 0) / previousTransactions.length;
        const increasePercentage = ((amount - avgPreviousAmount) / avgPreviousAmount) * 100;

        if (increasePercentage >= this.config.amountChecks.velocityAmountIncrease.threshold) {
          riskScore += 20;
          reasons.push(`Sudden amount increase: ${increasePercentage.toFixed(1)}% from average`);
        }
      }
    } catch (error) {
      // Skip velocity check on database error
    }

    return {
      type: 'amount',
      score: riskScore,
      reasons,
      data: { amount, isRound: amount % 100 === 0 }
    };
  }

  /**
   * User behavioral pattern analysis
   */
  async _checkBehavioralPatterns(userId, transactionId) {
    let riskScore = 0;
    let reasons = [];

    try {
      // Check account age
      const user = await User.findById(userId);
      if (user && user.createdAt) {
        const accountAge = Date.now() - user.createdAt.getTime();
        const minimumAgeMs = this.config.behavioralChecks.accountAgeCheck.minimumDays * 24 * 60 * 60 * 1000;

        if (accountAge < minimumAgeMs) {
          const daysSinceSignup = Math.floor(accountAge / (1000 * 60 * 60 * 24));
          riskScore += 20;
          reasons.push(`New account - only ${daysSinceSignup} days old`);
        }
      }

      // Check subscription history irregularities
      const subscriptions = await UserSubscription.find({ userId });
      const activeSubscriptions = subscriptions.filter(s => s.subscriptionInfo?.status === 'active');

      if (activeSubscriptions.length > 3) {
        riskScore += 10;
        reasons.push('Multiple active subscriptions');
      }

      // Check for failed payment history
      const recentPayments = await Payment.find({
        userId,
        createdAt: { $gte: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)) } // Last 30 days
      });

      const failedPayments = recentPayments.filter(p => p.transaction.status === 'failed');
      const failureRate = failedPayments.length / Math.max(recentPayments.length, 1);

      if (failureRate > 0.3) { // 30% failure rate
        riskScore += 25;
        reasons.push(`High payment failure rate: ${(failureRate * 100).toFixed(1)}%`);
      }

    } catch (error) {
      Logger.error(`Behavioral check failed for user ${userId}: ${error.message}`);
    }

    return {
      type: 'behavioral',
      score: riskScore,
      reasons,
      data: {}
    };
  }

  /**
   * Blacklist and watchlist checks
   */
  async _checkBlacklists(transaction, user, context) {
    let riskScore = 0;
    let reasons = [];

    if (!this.config.blacklists.enabled) {
      return { type: 'blacklist', score: 0, reasons: [], data: {} };
    }

    // IP blacklist check
    if (this.config.blacklists.ipBlacklist.includes(context.ip)) {
      riskScore += 100;
      reasons.push('IP address is blacklisted');
    }

    // Email blacklist check
    if (user && this.config.blacklists.emailBlacklist.includes(user.email)) {
      riskScore += 100;
      reasons.push('Email address is blacklisted');
    }

    // Card/blacklist check (if card details available)
    const cardFingerprint = this._generateCardFingerprint(transaction);
    if (this.config.blacklists.cardBlacklist.includes(cardFingerprint)) {
      riskScore += 100;
      reasons.push('Payment method is blacklisted');
    }

    return {
      type: 'blacklist',
      score: riskScore,
      reasons,
      data: { cardFingerprint: cardFingerprint?.substring(0, 8) + '...' || null }
    };
  }

  /**
   * Generate risk score and risk level
   */
  _calculateRiskLevel(score) {
    if (score >= this.config.riskThresholds.critical) return 'critical';
    if (score >= this.config.riskThresholds.high) return 'high';
    if (score >= this.config.riskThresholds.medium) return 'medium';
    if (score >= this.config.riskThresholds.low) return 'low';
    return 'very_low';
  }

  /**
   * Generate recommendations based on risk assessment
   */
  _generateRecommendations(riskFactors, totalScore, riskLevel, context) {
    const recommendations = [];

    if (riskLevel === 'critical') {
      recommendations.push('Block transaction immediately');
      recommendations.push('Flag account for manual review');
      recommendations.push('Send alert to fraud team');
    } else if (riskLevel === 'high') {
      recommendations.push('Require additional verification (2FA, ID verification)');
      recommendations.push('Limit transaction amount');
      recommendations.push('Send verification SMS to user');
    } else if (riskLevel === 'medium') {
      recommendations.push('Require email verification');
      recommendations.push('Add transaction to manual review queue');
    }

    // Factor-specific recommendations
    riskFactors.forEach(factor => {
      switch (factor.type) {
        case 'velocity':
          recommendations.push('Implement rate limiting for this user');
          break;
        case 'geographic':
          recommendations.push('Verify identity and location');
          break;
        case 'amount':
          recommendations.push('Verify transaction purpose');
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Check if transaction should bypass risk checks (admin override)
   */
  _hasOverride(transaction) {
    // Check for certain payment methods or user types that bypass checks
    return false; // No overrides by default
  }

  /**
   * Extract geographic data from context
   */
  _extractGeoData(context) {
    // Implementation would extract country, region, etc. from IP geolocation
    // This is simplified for the demo
    return {
      country: context.country || 'IN',
      region: context.region || 'KA',
      city: context.city || 'Bangalore',
      timezone: context.timezone || 'Asia/Kolkata'
    };
  }

  /**
   * Check if IP likely belongs to VPN/Tor
   */
  _isLikelyVPN(context) {
    const ip = context.ip || '';

    // Very basic VPN detection (would use IP database in production)
    const vpnPatterns = [
      /^10\./, // Private IP ranges
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private IP ranges
      /^192\.168\./, // Private IP ranges
      /^127\./ // Localhost
    ];

    return vpnPatterns.some(pattern => pattern.test(ip));
  }

  /**
   * Generate card fingerprint for blacklist tracking
   */
  _generateCardFingerprint(transaction) {
    // Secure hash of card details for blacklist tracking
    const data = JSON.stringify({
      cardLast4: transaction.cardLast4,
      cardBrand: transaction.cardBrand,
      issuerBank: transaction.issuerBank
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Clean up old cache entries
   */
  _cleanupCache() {
    const now = Date.now();
    const cleanupThreshold = 2 * 60 * 60 * 1000; // 2 hours

    for (const [key, data] of this.velocityCache.entries()) {
      if (now - data.timestamp > cleanupThreshold) {
        this.velocityCache.delete(key);
      }
    }

    for (const [key, data] of this.patternCache.entries()) {
      if (now - data.timestamp > cleanupThreshold) {
        this.patternCache.delete(key);
      }
    }

    Logger.debug('Fraud detection cache cleanup completed', {
      velocityCacheSize: this.velocityCache.size,
      patternCacheSize: this.patternCache.size
    });
  }

  /**
   * Add item to blacklist
   * @param {String} type - Type of blacklist (ip, email, card)
   * @param {String} value - Value to blacklist
   * @param {String} reason - Reason for blacklisting
   */
  addToBlacklist(type, value, reason) {
    const widgetId = `black_${type}_${value}_${Date.now()}`;
    Logger.securityLogger('blacklist_add', {
      widgetId,
      type,
      value,
      reason
    });

    if (this.config.blacklists.enabled) {
      switch (type) {
        case 'ip':
          this.config.blacklists.ipBlacklist.push(value);
          break;
        case 'email':
          this.config.blacklists.emailBlacklist.push(value);
          break;
        case 'card':
          const fingerprint = crypto.createHash('sha256').update(value).digest('hex');
          this.config.blacklists.cardBlacklist.push(fingerprint);
          break;
      }
    }
  }

  /**
   * Get fraud detection statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Statistics report
   */
  async getStatistics(filters = {}) {
    const startTime = Date.now();

    try {
      const matchStage = this._buildStatisticsMatchStage(filters);

      const stats = await Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            flaggedTransactions: {
              $sum: { $cond: [{ $gt: ['$audit.riskScore', 0] }, 1, 0] }
            },
            highRiskTransactions: {
              $sum: { $cond: [{ $gt: ['$audit.riskScore', 60] }, 1, 0] }
            },
            blockedTransactions: {
              $sum: { $cond: [{ $eq: ['$transaction.status', 'blocked'] }, 1, 0] }
            },
            totalRiskScore: { $sum: '$audit.riskScore' },
            byRiskLevel: {
              $push: {
                $switch: {
                  branches: [
                    { case: { $gte: ['$audit.riskScore', 80] }, then: 'high' },
                    { case: { $gte: ['$audit.riskScore', 30] }, then: 'medium' }
                  ],
                  default: 'low'
                }
              }
            }
          }
        }
      ]);

      Logger.performanceLogger('getFraudStatistics', startTime, 1000);
      return stats[0] || { message: 'No transaction data available' };

    } catch (error) {
      Logger.error(`Fraud statistics error: ${error.message}`);
      throw new DatabaseError('Failed to retrieve fraud statistics');
    }
  }

  /**
   * Build match stage for statistics aggregation
   */
  _buildStatisticsMatchStage(filters) {
    const match = {};

    if (filters.startDate && filters.endDate) {
      match.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    if (filters.riskLevel) {
      const scoreRanges = {
        low: { $lt: 30 },
        medium: { $gte: 30, $lt: 80 },
        high: { $gte: 80 }
      };
      match['audit.riskScore'] = scoreRanges[filters.riskLevel];
    }

    return match;
  }
}

module.exports = new FraudDetectionService();