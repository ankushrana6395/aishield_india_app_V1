/**
 * Stripe Payment Gateway Adapter
 * Integrates with Stripe Checkout and Payment Intents API
 */

// External Dependencies
const stripeLib = require('stripe');

/**
 * Stripe Payment Gateway Adapter
 * Handles Stripe payment processing with CardElement integration
 */
class StripeAdapter {

  constructor() {
    // Initialize Stripe with secret key
    const secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_default_key';
    this.stripe = stripeLib(secretKey);

    // Webhook secret for signature verification
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;

    // Base URL for webhook endpoints
    this.baseUrl = process.env.REACT_APP_API_URL || process.env.BASE_URL || 'http://localhost:5002';

    // Payment intent timeout (24 hours for cards)
    this.intentTimeout = 24 * 60 * 60 * 1000;
  }

  /**
   * Create Payment Intent for client-side processing
   * @param {number} amount - Amount in smallest currency unit
   * @param {string} currency - Currency code (USD, INR, etc.)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Payment intent data
   */
  async createPaymentIntent(amount, currency, metadata = {}) {
    try {
      // Convert amount based on currency (Stripe expects amounts in cents for some currencies)
      const convertedAmount = this._convertAmount(amount, currency);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: convertedAmount,
        currency: currency.toLowerCase(),
        metadata: {
          ...metadata,
          integration_check: 'accept_a_payment',
          timestamp: new Date().toISOString(),
        },
        setup_future_usage: metadata.saveCard ? 'off_session' : undefined,
        receipt_email: metadata.customerEmail,
        description: metadata.description || 'Course Subscription Payment',

        // Automatic payment methods (new)
        automatic_payment_methods: {
          enabled: true,
        },

        // Metadata for tracking
        statement_descriptor_suffix: this._generateTransactionSuffix(metadata),

        // Custom fields for compliance
        application_fee_amount: this._calculateApplicationFee(convertedAmount),
        transfer_data: {
          amount: convertedAmount - (this._calculateApplicationFee(convertedAmount) || 0),
          destination: metadata.merchantId || process.env.STRIPE_CONNECTED_ACCOUNT,
        },

        // Fraud detection
        radar_options: {
          fail_blocked_by_radar: true,
          payment_fraud_detection: 'standard'
        }
      });

      return {
        gateway: 'stripe',
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        currency: currency,
        status: paymentIntent.status,
        gatewayMetadata: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          created: paymentIntent.created,
          last_payment_error: paymentIntent.last_payment_error
        }
      };

    } catch (error) {
      console.error('Stripe PaymentIntent creation error:', error.message);

      throw {
        type: 'gateway_error',
        code: error.code || 'payment_intent_creation_failed',
        message: 'Failed to create payment intent',
        originalError: error,
        gateway: 'stripe',
        retryable: this._isRetryableError(error)
      };
    }
  }

  /**
   * Retrieve and verify payment intent status
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<Object>} Payment verification result
   */
  async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['payment_method', 'charges.data', 'latest_charge']
      });

      return {
        gateway: 'stripe',
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        charges: paymentIntent.charges?.data || [],
        last_charge: paymentIntent.latest_charge,
        payment_method: paymentIntent.payment_method,
        receipt_email: paymentIntent.receipt_email,
        failure_code: paymentIntent.last_payment_error?.code,
        failure_message: paymentIntent.last_payment_error?.message,
        verified: ['succeeded', 'processing'].includes(paymentIntent.status),
        error: paymentIntent.last_payment_error
      };

    } catch (error) {
      console.error('Stripe PaymentIntent retrieval error:', error.message);

      throw {
        type: 'gateway_error',
        code: 'payment_intent_retrieval_failed',
        message: 'Failed to retrieve payment intent',
        originalError: error,
        gateway: 'stripe'
      };
    }
  }

  /**
   * Process refund for Stripe payment
   * @param {string} paymentIntentId - Payment intent ID
   * @param {number} amount - Refund amount
   * @param {string} reason - Refund reason
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Refund result
   */
  async refundPayment(paymentIntentId, amount, reason, metadata = {}) {
    try {
      // Retrieve the payment intent to get charge ID
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge']
      });

      if (!paymentIntent.latest_charge) {
        throw new Error('No charge found for this payment intent');
      }

      const refund = await this.stripe.refunds.create({
        charge: paymentIntent.latest_charge.id,
        amount: this._convertAmount(amount, paymentIntent.currency),
        reason: this._mapRefundReason(reason),
        metadata: {
          ...metadata,
          payment_intent: paymentIntentId,
          refund_reason: reason,
          processed_by: 'gateway_adapter'
        }
      });

      return {
        refundId: refund.id,
        paymentIntentId: paymentIntentId,
        chargeId: refund.charge,
        amount: amount,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        gatewayMetadata: {
          id: refund.id,
          object: refund.object,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
          created: refund.created,
          processed: new Date()
        }
      };

    } catch (error) {
      console.error('Stripe refund error:', error.message);

      throw {
        type: 'gateway_error',
        code: 'refund_failed',
        message: 'Failed to process refund',
        originalError: error,
        gateway: 'stripe'
      };
    }
  }

  /**
   * Create customer in Stripe (for recurring payments)
   * @param {Object} customerData - Customer information
   * @returns {Promise<Object>} Customer creation result
   */
  async createCustomer(customerData) {
    try {
      const customer = await this.stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        metadata: {
          userId: customerData.userId,
          source: 'subscription_platform',
          createdAt: new Date().toISOString()
        }
      });

      return {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        gatewayMetadata: customer
      };

    } catch (error) {
      console.error('Stripe customer creation error:', error.message);

      throw {
        type: 'gateway_error',
        code: 'customer_creation_failed',
        message: 'Failed to create customer',
        originalError: error,
        gateway: 'stripe'
      };
    }
  }

  /**
   * Create subscription with automatic recurring payments
   * @param {Object} subscriptionData - Subscription configuration
   * @returns {Promise<Object>} Subscription creation result
   */
  async createSubscription(subscriptionData) {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: subscriptionData.customerId,
        items: [{
          price_data: {
            currency: subscriptionData.currency,
            product_data: {
              name: subscriptionData.productName,
              description: subscriptionData.description
            },
            unit_amount: this._convertAmount(subscriptionData.amount, subscriptionData.currency)
          }
        }],
        default_payment_method: subscriptionData.paymentMethodId,
        metadata: {
          ...subscriptionData.metadata,
          source: 'subscription_platform',
          createdAt: new Date().toISOString()
        }
      });

      return {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        gatewayMetadata: subscription
      };

    } catch (error) {
      console.error('Stripe subscription creation error:', error.message);

      throw {
        type: 'gateway_error',
        code: 'subscription_creation_failed',
        message: 'Failed to create subscription',
        originalError: error,
        gateway: 'stripe'
      };
    }
  }

  /**
   * Verify webhook signature
   * @param {Buffer} rawBody - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {boolean} Signature verification result
   */
  verifyWebhookSignature(rawBody, signature) {
    if (!this.webhookSecret) {
      console.warn('Stripe webhook secret not configured, skipping verification');
      return true; // In development, accept all webhooks
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret
      );

      return {
        verified: true,
        event: event,
        eventType: event.type,
        eventData: event.data
      };

    } catch (error) {
      console.error('Stripe webhook signature verification failed:', error.message);
      return {
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * Handle Stripe webhook events
   * @param {Object} webhookEvent - Webhook event data
   * @returns {Promise<Object>} Webhook processing result
   */
  async processWebhookEvent(webhookEvent) {
    const { type, data } = webhookEvent;

    try {
      switch (type) {
        case 'payment_intent.succeeded':
          return await this._handlePaymentSucceeded(data.object);

        case 'payment_intent.payment_failed':
          return await this._handlePaymentFailed(data.object);

        case 'invoice.payment_succeeded':
          return await this._handleInvoicePaid(data.object);

        case 'invoice.payment_failed':
          return await this._handleInvoiceFailed(data.object);

        case 'customer.subscription.created':
          return await this._handleSubscriptionCreated(data.object);

        case 'customer.subscription.updated':
          return await this._handleSubscriptionUpdated(data.object);

        case 'customer.subscription.deleted':
          return await this._handleSubscriptionDeleted(data.object);

        default:
          return {
            processed: true,
            action: 'ignored',
            reason: `Unhandled event type: ${type}`
          };
      }

    } catch (error) {
      console.error('Stripe webhook processing error:', error);
      return {
        processed: false,
        error: error.message,
        eventType: type
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Convert amount based on currency requirements
   * @param {number} amount - Amount in INR (system currency)
   * @param {string} currency - Target currency
   * @returns {number} Converted amount
   */
  _convertAmount(amount, currency) {
    // Stripe expects amounts in cents for most currencies
    switch (currency.toLowerCase()) {
      case 'usd':
      case 'eur':
      case 'gbp':
      case 'aud':
      case 'cad':
      case 'sgd':
      case 'myr':
        // Convert from INR to target currency (simplified conversion)
        return Math.round(amount * 100); // Assume passed amount is already in target currency

      case 'inr':
        return Math.round(amount * 100); // INR cents

      default:
        return Math.round(amount * 100);
    }
  }

  /**
   * Calculate Stripe application fee (platform fee)
   * @param {number} amount - Amount in cents
   * @returns {number} Platform fee
   */
  _calculateApplicationFee(amount) {
    // 2% platform fee + ₹3 fixed fee
    const percentageFee = Math.round(amount * 0.02);
    const fixedFee = 3 * 100; // ₹3 in paise
    return percentageFee + fixedFee;
  }

  /**
   * Generate transaction suffix for card statements
   * @param {Object} metadata - Transaction metadata
   * @returns {string} Statement descriptor
   */
  _generateTransactionSuffix(metadata) {
    const base = 'PENETEST';
    const timestamp = Date.now().toString().slice(-4); // Last 4 digits
    return `${base}${timestamp}`;
  }

  /**
   * Map internal refund reasons to Stripe reasons
   * @param {string} internalReason - Internal refund reason
   * @returns {string} Stripe refund reason
   */
  _mapRefundReason(internalReason) {
    const reasonMap = {
      customer_request: 'requested_by_customer',
      service_discontinued: 'service_disrupted',
      billing_error: 'duplicate',
      fraud: 'fraudulent',
      duplicate: 'duplicate'
    };

    return reasonMap[internalReason] || internalReason;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Stripe error
   * @returns {boolean} Whether error is retryable
   */
  _isRetryableError(error) {
    const retryableCodes = [
      'card_declined',
      'insufficient_funds',
      'network_timeout',
      'expired_card'
    ];

    return retryableCodes.includes(error.code);
  }

  // ============================================================================
  // WEBHOOK EVENT HANDLERS
  // ============================================================================

  async _handlePaymentSucceeded(paymentIntent) {
    // Update payment status in our system
    const updateData = {
      status: 'completed',
      'transaction.paymentId': paymentIntent.charges.data[0]?.id,
      'audit.completedAt': new Date(),
      'audit.gatewayMetadata': {
        paymentIntent: paymentIntent,
        charge: paymentIntent.charges.data[0]
      }
    };

    // Find and update our payment record
    // This would typically involve database operations
    console.log('Processing payment success:', paymentIntent.id);

    return {
      processed: true,
      action: 'payment_completed',
      paymentIntentId: paymentIntent.id,
      chargeId: paymentIntent.charges.data[0]?.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    };
  }

  async _handlePaymentFailed(paymentIntent) {
    console.log('Processing payment failure:', paymentIntent.id);

    return {
      processed: true,
      action: 'payment_failed',
      paymentIntentId: paymentIntent.id,
      error: paymentIntent.last_payment_error
    };
  }

  async _handleInvoicePaid(invoice) {
    console.log('Processing invoice payment:', invoice.id);

    return {
      processed: true,
      action: 'invoice_paid',
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription
    };
  }

  async _handleInvoiceFailed(invoice) {
    console.log('Processing invoice failure:', invoice.id);

    return {
      processed: true,
      action: 'invoice_failed',
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription
    };
  }

  // Additional webhook handlers for subscription events
  async _handleSubscriptionCreated(subscription) {
    return {
      processed: true,
      action: 'subscription_created',
      subscriptionId: subscription.id
    };
  }

  async _handleSubscriptionUpdated(subscription) {
    return {
      processed: true,
      action: 'subscription_updated',
      subscriptionId: subscription.id
    };
  }

  async _handleSubscriptionDeleted(subscription) {
    return {
      processed: true,
      action: 'subscription_deleted',
      subscriptionId: subscription.id
    };
  }
}

module.exports = StripeAdapter;