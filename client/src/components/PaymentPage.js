import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const PaymentPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { user, updateSubscriptionStatus } = useAuth();
  const navigate = useNavigate();
  const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID || 'your_razorpay_key_id';

  // Load selected plan details from localStorage
  useEffect(() => {
    console.log('🚀 PaymentPage: useEffect triggered for plan loading');
    const planData = localStorage.getItem('selectedPlan');
    console.log('📦 PaymentPage: localStorage planData:', planData);

    if (planData) {
      try {
        const plan = JSON.parse(planData);
        console.log('🔄 PaymentPage: Loaded selected plan:', {
          name: plan.name,
          price: plan.pricing?.price,
          currency: plan.pricing?.currency,
          planId: plan._id
        });
        setSelectedPlan(plan);
      } catch (error) {
        console.error('❌ PaymentPage: Error parsing selected plan data:', error);
        setError('Invalid plan data. Please select a plan again.');
      }
    } else {
      console.log('⚠️ PaymentPage: No selected plan found in localStorage');
      setError('No plan selected. Please choose a subscription plan first.');
      // Don't redirect immediately - let user see the error
      // setTimeout(() => navigate('/'), 3000);
    }
  }, []);

  // If user is already subscribed to any plan, redirect to dashboard
  useEffect(() => {
    console.log('🔐 PaymentPage: Subscription check useEffect');
    console.log('👤 PaymentPage: User details:', {
      userPresent: !!user,
      userName: user?.name,
      isSubscribed: user?.isSubscribed,
      subscription: user?.subscription
    });

    if (user && user.isSubscribed) {
      console.log('⚠️ PaymentPage: User already has active subscription, redirecting to dashboard');
      console.log('📋 PaymentPage: User subscription details:', user.subscription);
      navigate('/');
    } else {
      console.log('✅ PaymentPage: User can proceed with payment (no active subscription)');
    }
  }, [user, navigate]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const displayRazorpay = async () => {
    setLoading(true);
    setError('');

    console.log('🚀 PaymentPage: Starting payment process');

    // Ensure selected plan exists
    if (!selectedPlan) {
      console.error('❌ PaymentPage: No plan selected');
      setError('No plan selected. Please go back and choose a plan.');
      setLoading(false);
      return;
    }
    console.log('✅ PaymentPage: Plan verified:', { name: selectedPlan.name, planId: selectedPlan._id });

    // Load Razorpay script
    console.log('⏳ PaymentPage: Loading Razorpay script...');
    const res = await loadRazorpayScript();

    if (!res) {
      console.error('❌ PaymentPage: Failed to load Razorpay script');
      setError('Failed to load payment gateway. Please try again later.');
      setLoading(false);
      return;
    }
    console.log('✅ PaymentPage: Razorpay script loaded successfully');

    try {
      // Use plan-specific pricing
      const planPrice = selectedPlan.pricing?.price || selectedPlan.price || 19.99;
      const planCurrency = selectedPlan.pricing?.currency || 'INR';
      const planId = selectedPlan._id;

      console.log('💳 PaymentPage: Creating order for plan:', {
        planName: selectedPlan.name,
        planId,
        price: planPrice,
        currency: planCurrency,
        razorpayKey: razorpayKey ? '[SET]' : '[NOT SET]'
      });

      // Get auth token
      const token = localStorage.getItem('token');
      console.log('🎫 PaymentPage: Auth token present:', !!token);

      // Create order with plan-specific amount and planId
      console.log('📡 PaymentPage: Making API call to /api/payment/order');
      const orderResponse = await axios.post('/api/payment/order', {
        amount: planPrice,
        currency: planCurrency,
        planId: planId
      }, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ PaymentPage: Order created successfully:', {
        orderId: orderResponse.data.orderId,
        amount: orderResponse.data.amount,
        currency: orderResponse.data.currency,
        status: orderResponse.status
      });

      // Check if Razorpay is available
      console.log('🔍 PaymentPage: Checking if Razorpay object is available:', !!window.Razorpay);
      if (!window.Razorpay) {
        console.error('❌ PaymentPage: Razorpay object not found on window');
        setError('Payment gateway not loaded. Please refresh the page.');
        setLoading(false);
        return;
      }

      const options = {
        key: razorpayKey,
        amount: orderResponse.data.amount,
        currency: orderResponse.data.currency,
        name: 'AIShield India',
        description: `${selectedPlan.name} - Course Access`,
        order_id: orderResponse.data.orderId,
        handler: async function (response) {
          try {
            console.log('🔄 PaymentPage: Payment completed, verifying...', response);

            // Verify payment with planId
            const verifyResponse = await axios.post('/api/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: planId
            }, {
              headers: {
                Authorization: token ? `Bearer ${token}` : undefined,
                'Content-Type': 'application/json'
              }
            });

            console.log('✅ PaymentPage: Payment verified:', verifyResponse.data);

            if (verifyResponse.data.success) {
              // Clear the selected plan from localStorage after successful payment
              localStorage.removeItem('selectedPlan');
              updateSubscriptionStatus(true);
              console.log('🏠 PaymentPage: Redirecting to dashboard after successful payment');
              navigate('/');
            } else {
              console.error('❌ PaymentPage: Payment verification failed');
              setError('Payment verification failed. Please contact support.');
            }
          } catch (err) {
            console.error('❌ PaymentPage: Payment verification error:', err);
            setError('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#00ff88'
        }
      };

      console.log('🎯 PaymentPage: Initializing Razorpay with options:', {
        key: razorpayKey,
        amount: options.amount,
        currency: options.currency,
        orderId: options.order_id
      });

      const paymentObject = new window.Razorpay(options);

      // Add error callback
      paymentObject.on('payment.failed', function (response){
        console.error('❌ PaymentPage: Payment failed:', response.error);
        setError('Payment failed. Please try again.');
      });

      console.log('🔓 PaymentPage: Opening Razorpay payment modal');
      paymentObject.open();

    } catch (err) {
      console.error('❌ PaymentPage: Payment initialization error:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        responseData: err.response?.data
      });
      setError('Failed to initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (user && user.isSubscribed) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a1121',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;900&family=Roboto:wght@300;400;500;700&display=swap');
            
            .info-box {
              background: #111c30;
              border: 1px solid #00ff88;
              border-radius: 8px;
              padding: 30px;
              text-align: center;
              max-width: 500px;
              width: 90%;
            }
            
            .info-title {
              font-family: 'Orbitron', sans-serif;
              color: #00ff88;
              margin-bottom: 15px;
            }
            
            .info-message {
              color: #e0e0e0;
              font-family: 'Roboto', sans-serif;
            }
            
            .back-button {
              background: #00aaff;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 12px 24px;
              font-family: 'Orbitron', sans-serif;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.3s ease;
              margin-top: 20px;
            }
            
            .back-button:hover {
              background: #0088cc;
              box-shadow: 0 0 15px rgba(0, 170, 255, 0.6);
              transform: translateY(-2px);
            }
          `}
        </style>
        <div className="info-box">
          <h2 className="info-title">Active Subscription</h2>
          <p className="info-message">You already have an active subscription.</p>
          <button 
            className="back-button"
            onClick={() => navigate('/')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a1121',
      color: '#e0e0e0',
      fontFamily: "'Roboto', sans-serif",
      padding: '20px'
    }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;900&family=Roboto:wght@300;400;500;700&display=swap');
          
          .payment-container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 30px 20px;
          }
          
          .payment-header {
            text-align: center;
            margin-bottom: 40px;
          }
          
          .payment-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 2.5rem;
            color: white;
            margin-bottom: 10px;
            text-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
          }
          
          .payment-subtitle {
            font-family: 'Roboto', sans-serif;
            font-size: 1.2rem;
            color: #00aaff;
          }
          
          .payment-layout {
            display: flex;
            flex-wrap: wrap;
            gap: 30px;
            margin-top: 20px;
          }
          
          .features-section {
            flex: 1;
            min-width: 300px;
            background: #111c30;
            border: 1px solid #2a4060;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          }
          
          .features-title {
            font-family: 'Orbitron', sans-serif;
            color: #00ff88;
            margin-top: 0;
            margin-bottom: 25px;
            font-size: 1.8rem;
          }
          
          .feature-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 20px;
            gap: 15px;
          }
          
          .feature-icon {
            color: #00ff88;
            font-size: 1.5rem;
            margin-top: 3px;
          }
          
          .feature-text {
            font-family: 'Roboto', sans-serif;
            font-size: 1.1rem;
            color: #e0e0e0;
            line-height: 1.6;
          }
          
          .pricing-section {
            flex: 1;
            min-width: 300px;
            background: #111c30;
            border: 1px solid #2a4060;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
          }
          
          .price-display {
            font-family: 'Orbitron', sans-serif;
            font-size: 3rem;
            color: #00ff88;
            text-align: center;
            margin: 20px 0;
          }
          
          .price-description {
            text-align: center;
            color: #aaaaaa;
            font-family: 'Roboto', sans-serif;
            margin-bottom: 30px;
          }
          
          .security-info {
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid rgba(0, 255, 136, 0.3);
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            display: flex;
            align-items: center;
            gap: 15px;
          }
          
          .security-icon {
            color: #00ff88;
            font-size: 1.8rem;
          }
          
          .security-text {
            font-family: 'Roboto', sans-serif;
            color: #e0e0e0;
          }
          
          .payment-button {
            background: #00ff88;
            color: #0a1121;
            border: none;
            border-radius: 4px;
            padding: 16px;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            font-size: 1.2rem;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: auto;
          }
          
          .payment-button:hover {
            background: #00cc6d;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.6);
            transform: translateY(-3px);
          }
          
          .payment-button:disabled {
            background: #2a4060;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
          
          .error-message {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid #ff0000;
            border-radius: 8px;
            padding: 15px;
            color: #ff8888;
            margin: 20px 0;
            text-align: center;
            font-family: 'Roboto', sans-serif;
          }
          
          .loading-spinner {
            display: inline-block;
            width: 24px;
            height: 24px;
            border: 3px solid rgba(10, 17, 33, 0.3);
            border-radius: 50%;
            border-top-color: #0a1121;
            animation: spin 1s ease-in-out infinite;
            margin-right: 10px;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div className="payment-container">
        <div className="payment-header">
          <h1 className="payment-title">Subscribe to <span style={{color: '#00ff88'}}>{selectedPlan?.name || 'Course Plan'}</span></h1>
          <p className="payment-subtitle">
            {selectedPlan?.description || 'Unlock premium course content with this subscription plan'}
          </p>
        </div>

        <div className="payment-layout">
          <div className="features-section">
            <h2 className="features-title">Plan Features</h2>

            {/* Display courses included in the plan */}
            {selectedPlan?.includedCourses?.length > 0 && (
              <div className="feature-item">
                <div className="feature-icon">📚</div>
                <div className="feature-text">
                  <strong>{selectedPlan.includedCourses.length} Course{selectedPlan.includedCourses.length !== 1 ? 's' : ''} Included:</strong>
                  <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                    {selectedPlan.includedCourses.slice(0, 3).map((course, index) => (
                      <li key={index} style={{ marginBottom: '5px' }}>
                        {course.courseName || course.name || `Course ${index + 1}`}
                      </li>
                    ))}
                    {selectedPlan.includedCourses.length > 3 && (
                      <li style={{ fontStyle: 'italic', color: '#00aaff' }}>
                        +{selectedPlan.includedCourses.length - 3} more courses
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Display features from the plan */}
            {selectedPlan?.features && (
              <>
                {selectedPlan.features.certificates && (
                  <div className="feature-item">
                    <div className="feature-icon">✓</div>
                    <div className="feature-text">Certificate of Completion</div>
                  </div>
                )}

                {selectedPlan.features.unlimitedLectures && (
                  <div className="feature-item">
                    <div className="feature-icon">✓</div>
                    <div className="feature-text">Unlimited Lecture Access</div>
                  </div>
                )}

                {selectedPlan.features.mobileAccess && (
                  <div className="feature-item">
                    <div className="feature-icon">✓</div>
                    <div className="feature-text">Mobile & Desktop Access</div>
                  </div>
                )}

                {selectedPlan.features.lifetimeAccess && (
                  <div className="feature-item">
                    <div className="feature-icon">✓</div>
                    <div className="feature-text">Lifetime Access</div>
                  </div>
                )}

                {selectedPlan.features.prioritySupport && (
                  <div className="feature-item">
                    <div className="feature-icon">✓</div>
                    <div className="feature-text">Priority Support</div>
                  </div>
                )}
              </>
            )}

            {/* Default features if no plan-specific features */}
            {(!selectedPlan?.features || Object.keys(selectedPlan.features).length === 0) && (
              <>
                <div className="feature-item">
                  <div className="feature-icon">✓</div>
                  <div className="feature-text">30+ Comprehensive Lectures</div>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">✓</div>
                  <div className="feature-text">Hands-on Practical Examples</div>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">✓</div>
                  <div className="feature-text">Regular Content Updates</div>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">✓</div>
                  <div className="feature-text">Certificate of Completion</div>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">✓</div>
                  <div className="feature-text">24/7 Access to All Materials</div>
                </div>
              </>
            )}
          </div>

          <div className="pricing-section">
            <div className="price-display">
              {selectedPlan?.pricing?.currency === 'INR' ? '₹' : '$'}
              {selectedPlan?.pricing?.price || selectedPlan?.price || '19.99'}
            </div>
            <div className="price-description">
              {selectedPlan?.pricing?.billingCycle === 'monthly' ? 'Monthly subscription' :
               selectedPlan?.pricing?.billingCycle === 'yearly' ? 'Yearly subscription' :
               selectedPlan?.pricing?.billingCycle === 'quarterly' ? 'Quarterly subscription' :
               selectedPlan?.pricing?.billingCycle === 'lifetime' ? 'One-time payment for lifetime access' :
               'One-time payment for lifetime access'}
            </div>

            <div className="security-info">
              <div className="security-icon">🔒</div>
              <div className="security-text">
                Secure payment powered by Razorpay. Your payment information is encrypted and secure.
              </div>
            </div>

            {error && (
              <div className="error-message">{error}</div>
            )}

            <button
              className="payment-button"
              onClick={displayRazorpay}
              disabled={loading || !selectedPlan}
            >
              {loading ? (
                <span>
                  <span className="loading-spinner"></span> Processing...
                </span>
              ) : (
                `Subscribe to ${selectedPlan?.name || 'Plan'}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
