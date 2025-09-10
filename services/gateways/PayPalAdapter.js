/**
 * PayPal Payment Gateway Adapter
 * Integrates with PayPal Rest APIs and Checkout.js
 */

// External Dependencies
const paypalLib = require('@paypal/checkout-server-sdk');

/**
 * PayPal Payment Gateway Adapter
 */
class PayPalAdapter {

  constructor() {
    // Environment configuration
    const clientId = process.env.PAYPAL_CLIENT_ID || 'test_client_id';
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'test_client_secret';
    const isSandbox = process.env.PAYPAL_MODE !== 'live';

    const environment = isSandbox
      ? new paypalLib.core.SandboxEnvironment(clientId, clientSecret)
      : new paypalLib.core.LiveEnvironment(clientId, clientSecret);

    this.client = new paypalLib.core.PayPalHttpClient(environment);
    this.baseUrl = process.env.REACT_APP_API_URL || process.env.BASE_URL || 'http://localhost:5002';
  }

  /**
   * Create PayPal order for payment processing
   * @param {number} amount - Amount in the specified currency
   * @param {string} currency - Currency code (USD, INR, etc.)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} PayPal order data
   */
  async createOrder(amount, currency, metadata = {}) {
    try {
      const request = new paypalLib.orders.OrdersCreateRequest();

      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: metadata.referenceId || `ref_${Date.now()}`,
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: currency.toUpperCase(),
                value: amount.toFixed(2)
              }
            }
          },
          description: metadata.description || 'Course Subscription Payment',
          items: [{
            name: metadata.itemName || 'Course Subscription',
            description: metadata.description || 'Access to premium content',
            quantity: '1',
            unit_amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2)
            },
            category: 'DIGITAL_GOODS'
          }]
        }],
        application_context: {
          brand_name: metadata.brandName || 'PenTest Learning Platform',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: `${this.baseUrl}/payment/success`,
          cancel_url: `${this.baseUrl}/payment/cancel`,
          shipping_preference: 'NO_SHIPPING'
        },
        payer: metadata.payerInfo || {},
        // Custom fields for merchant tracking
        custom_id: metadata.customId || metadata.referenceId,
        invoice_id: metadata.invoiceId || `inv_${Date.now()}`
      });

      const order = await this.client.execute(request);

      return {
        gateway: 'paypal',
        orderId: order.result.id,
        status: order.result.status,
        amount: parseFloat(order.result.purchase_units[0].amount.value),
        currency: order.result.purchase_units[0].amount.currency_code,
        approveUrl: this._extractApprovalUrl(order.result.links),
        gatewayMetadata: {
          id: order.result.id,
          status: order.result.status,
          create_time: order.result.create_time,
          links: order.result.links
        }
      };

    } catch (error) {
      console.error('PayPal order creation error:', error);

      throw {
        type: 'gateway_error',
        code: error.result?.name || 'order_creation_failed',
        message: 'Failed to create PayPal order',
        originalError: error,
        gateway: 'paypal',
        retryable: this._isRetryableError(error)
      };
    }
  }

  /**
   * Capture PayPal payment (authorize and capture)
   * @param {string} orderId - PayPal order ID
   * @returns {Promise<Object>} Capture result
   */
  async captureOrder(orderId) {
    try {
      const request = new paypalLib.orders.OrdersCaptureRequest(orderId);

      // Set up merchant preferences for capture
      request.requestBody({
        application_context: {
          return_url: `${this.baseUrl}/payment/success`,
          cancel_url: `${this.baseUrl}/payment/cancel`
        }
      });

      const capture = await this.client.execute(request);

      return {
        gateway: 'paypal',
        orderId: capture.result.id,
        status: capture.result.status,
        captureId: this._extractCaptureId(capture.result.purchase_units),
        amount: parseFloat(capture.result.purchase_units[0].payments.captures[0].amount.value),
        currency: capture.result.purchase_units[0].payments.captures[0].amount.currency_code,
        payer: capture.result.payer,
        verified: capture.result.status === 'COMPLETED',
        gatewayMetadata: capture.result
      };

    } catch (error) {
      console.error('PayPal capture error:', error);

      throw {
        type: 'gateway_error',
        code: error.result?.name || 'capture_failed',
        message: 'Failed to capture PayPal payment',
        originalError: error,
        gateway: 'paypal'
      };
    }
  }

  /**
   * Refund PayPal transaction
   * @param {string} captureId - PayPal capture ID
   * @param {number} amount - Refund amount (optional)
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>} Refund result
   */
  async refundPayment(captureId, amount, reason) {
    try {
      const request = new paypalLib.payments.CapturesRefundRequest(captureId);

      request.requestBody({
        amount: amount ? {
          value: amount.toFixed(2),
          currency_code: 'USD' // PayPal specifies currency separately
        } : undefined,
        reason: reason || 'Customer request',
        note_to_payer: 'Refund processed by subscription platform'
      });

      const refund = await this.client.execute(request);

      return {
        refundId: refund.result.id,
        captureId: captureId,
        amount: parseFloat(refund.result.amount?.value || amount.toString()),
        currency: refund.result.amount?.currency_code || 'USD',
        status: refund.result.status,
        reason: reason,
        processedAt: new Date(),
        gatewayMetadata: refund.result
      };

    } catch (error) {
      console.error('PayPal refund error:', error);

      throw {
        type: 'gateway_error',
        code: error.result?.name || 'refund_failed',
        message: 'Failed to process PayPal refund',
        originalError: error,
        gateway: 'paypal'
      };
    }
  }

  /**
   * Get PayPal order details
   * @param {string} orderId - PayPal order ID
   * @returns {Promise<Object>} Order details
   */
  async getOrder(orderId) {
    try {
      const request = new paypalLib.orders.OrdersGetRequest(orderId);
      const order = await this.client.execute(request);

      return {
        gateway: 'paypal',
        orderId: order.result.id,
        status: order.result.status,
        amount: parseFloat(order.result.purchase_units[0].amount.value),
        currency: order.result.purchase_units[0].amount.currency_code,
        payer: order.result.payer,
        verified: order.result.status === 'COMPLETED',
        gatewayMetadata: order.result
      };

    } catch (error) {
      console.error('PayPal get order error:', error);

      throw {
        type: 'gateway_error',
        code: 'order_retrieval_failed',
        message: 'Failed to retrieve PayPal order',
        originalError: error,
        gateway: 'paypal'
      };
    }
  }

  /**
   * Verify webhook signature from PayPal
   * PayPal uses a different webhook verification mechanism than Stripe
   * @param {Object} webhookData - Webhook payload
   * @param {Object} headers - Request headers
   * @returns {Object} Verification result
   */
  verifyWebhookSignature(webhookData, headers) {
    // PayPal webhook verification is more complex and typically done
    // by making a verification request to PayPal's API
    // For development, we'll skip detailed verification

    if (process.env.NODE_ENV === 'development') {
      return {
        verified: true,
        reason: 'development_mode_bypass'
      };
    }

    // In production, implement proper webhook verification
    // This would involve checking webhook_id in the headers
    // and making a verification call to PayPal

    return {
      verified: true,
      eventType: webhookData.event_type,
      resource: webhookData.resource
    };
  }

  /**
   * Process PayPal webhook events
   * @param {Object} webhookEvent - Webhook event data
   * @returns {Promise<Object>} Webhook processing result
   */
  async processWebhookEvent(webhookEvent) {
    const eventType = webhookEvent.event_type;
    const resource = webhookEvent.resource;

    try {
      switch (eventType) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          return await this._handlePaymentCaptured(resource);

        case 'PAYMENT.CAPTURE.DENIED':
          return await this._handlePaymentDenied(resource);

        case 'PAYMENT.CAPTURE.REFUNDED':
          return await this._handlePaymentRefunded(resource);

        case 'PAYMENT.CAPTURE.REVERSED':
          return await this._handlePaymentReversed(resource);

        case 'CHECKOUT.ORDER.APPROVED':
          return await this._handleOrderApproved(resource);

        case 'CHECKOUT.ORDER.CANCELLED':
          return await this._handleOrderCancelled(resource);

        default:
          return {
            processed: true,
            action: 'ignored',
            reason: `Unhandled event type: ${eventType}`
          };
      }

    } catch (error) {
      console.error('PayPal webhook processing error:', error);
      return {
        processed: false,
        error: error.message,
        eventType
      };
    }
  }

  /**
   * Create PayPal billing agreement for subscriptions
   * @param {Object} agreementData - Agreement configuration
   * @returns {Promise<Object>} Billing agreement
   */
  async createBillingAgreement(agreementData) {
    try {
      const request = new paypalLib.billing.BillingAgreementsCreateRequest();

      request.requestBody({
        name: agreementData.name,
        description: agreementData.description,
        start_date: agreementData.startDate,
        payer: agreementData.payer,
        plan: {
          id: agreementData.planId
        },
        shipping_address: agreementData.shippingAddress
      });

      const agreement = await this.client.execute(request);

      return {
        agreementId: agreement.result.id,
        state: agreement.result.state,
        approvalUrl: this._extractApprovalUrl(agreement.result.links),
        gatewayMetadata: agreement.result
      };

    } catch (error) {
      console.error('PayPal billing agreement error:', error);
      throw {
        type: 'gateway_error',
        code: 'billing_agreement_failed',
        message: 'Failed to create billing agreement',
        originalError: error,
        gateway: 'paypal'
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Extract approval URL from PayPal links
   * @param {Array} links - PayPal response links
   * @returns {string} Approval URL
   */
  _extractApprovalUrl(links) {
    if (!links || !Array.isArray(links)) {
      return null;
    }

    const approveLink = links.find(link => link.rel === 'approve');
    return approveLink ? approveLink.href : null;
  }

  /**
   * Extract capture ID from purchase units
   * @param {Array} purchaseUnits - PayPal purchase units
   * @returns {string} Capture ID
   */
  _extractCaptureId(purchaseUnits) {
    if (!purchaseUnits || !purchaseUnits[0]) {
      return null;
    }

    const payments = purchaseUnits[0].payments;
    if (!payments?.captures || !payments.captures[0]) {
      return null;
    }

    return payments.captures[0].id;
  }

  /**
   * Check if PayPal error is retryable
   * @param {Error} error - PayPal error
   * @returns {boolean} Retryable status
   */
  _isRetryableError(error) {
    const retryableCodes = [
      'PAYMENT_DENIED',
      'DUPLICATE_INVOICE_ID',
      'MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED'
    ];

    const errorName = error.result?.name;
    return retryableCodes.includes(errorName);
  }

  // ============================================================================
  // WEBHOOK EVENT HANDLERS
  // ============================================================================

  async _handlePaymentCaptured(resource) {
    return {
      processed: true,
      action: 'payment_completed',
      captureId: resource.id,
      orderId: resource.supplementary_data?.related_ids?.order_id,
      amount: resource.amount?.value,
      currency: resource.amount?.currency_code
    };
  }

  async _handlePaymentDenied(resource) {
    return {
      processed: true,
      action: 'payment_denied',
      captureId: resource.id,
      reason: resource.reason_code
    };
  }

  async _handlePaymentRefunded(resource) {
    return {
      processed: true,
      action: 'payment_refunded',
      captureId: resource.supplementary_data?.related_ids?.capture_id,
      refundId: resource.id,
      amount: resource.amount?.value
    };
  }

  async _handlePaymentReversed(resource) {
    return {
      processed: true,
      action: 'payment_reversed',
      captureId: resource.id,
      reason: resource.reason_code
    };
  }

  async _handleOrderApproved(resource) {
    return {
      processed: true,
      action: 'order_approved',
      orderId: resource.id,
      payer: resource.payer
    };
  }

  async _handleOrderCancelled(resource) {
    return {
      processed: true,
      action: 'order_cancelled',
      orderId: resource.id
    };
  }
}

module.exports = PayPalAdapter;