import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';



const SubscriptionGrid = ({ onSelectPlan, userSubscription }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      console.log('📡 Dashboard: Fetching subscription plans from API');
      const response = await axios.get('/api/subscription-plans/plans?limit=10');
      console.log('📡 Dashboard: API response received');
      console.log('📊 Dashboard: Response data structure:', {
        hasPlans: !!(response.data.plans),
        plansCount: response.data.plans?.length || 0,
        pagination: response.data.pagination
      });

      const plans = response.data.plans || [];
      console.log('📊 Dashboard: First 2 plans sample:', plans.slice(0, 2).map(plan => ({
        name: plan.name,
        published: plan.published,
        business: plan.business
      })));

      setPlans(plans);

      // Log plans that would be disabled
      plans.forEach(plan => {
        const isPublished = plan.published === true;
        const isPublishedByBusiness = plan.business && plan.business.isActive === true && plan.business.isVisible === true;
        console.log(`📋 Plan "${plan.name}": published=${plan.published}, business=${!!plan.business}, would be ${isPublished || isPublishedByBusiness ? 'enabled' : 'disabled'}`);
      });

    } catch (error) {
      console.error('❌ Dashboard: Error fetching subscription plans:', error);
      console.error('❌ Dashboard: Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const isPlanActive = (planId) => {
    console.log('🔍 Dashboard: Checking if plan is active:', {
      userSubscription: !!userSubscription,
      hasSubscription: !!(userSubscription?.subscription),
      planId
    });

    if (!userSubscription || !userSubscription.subscription) {
      console.log('❌ Dashboard: No user subscription found');
      return false;
    }

    const planIdStr = typeof planId === 'string' ? planId : planId?.toString();
    const userPlanIdStr = typeof userSubscription.subscription.planId === 'string'
      ? userSubscription.subscription.planId
      : userSubscription.subscription.planId?.toString?.() || userSubscription.subscription.planId;

    const isActive = planIdStr === userPlanIdStr &&
           userSubscription.subscription.status === 'completed' &&
           new Date(userSubscription.subscription.expiresAt) > new Date();

    console.log('📊 Dashboard: Plan active check:', {
      planIdStr,
      userPlanIdStr,
      subscriptionStatus: userSubscription.subscription.status,
      expiresAt: userSubscription.subscription.expiresAt,
      currentTime: new Date().toISOString(),
      isActive
    });

    return isActive;
  };

  const isPlanPublished = (plan) => {
    // Check both old and new structure - backend may return either
    const publishedByOldField = plan.published === true;
    const publishedByNewFields = plan.business && plan.business.isActive === true && plan.business.isVisible === true;

    const isPublished = publishedByOldField || publishedByNewFields;

    console.log('📋 Dashboard: Plan publish status check for', plan.name);
    console.log('   Old field (published):', plan.published);
    console.log('   New fields (business):', plan.business);
    console.log('   Final published status:', isPublished);

    return isPublished;
  };

  const togglePlanExpansion = (planId) => {
    setExpandedPlan(expandedPlan === planId ? null : planId);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px'
      }}>
        <div className="loading-spinner"></div>
        <div style={{ marginLeft: '15px', color: '#00ff88', fontFamily: 'Orbitron, sans-serif' }}>
          Loading Subscription Plans...
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-grid">
      {plans.map((plan) => {
        const planIsActive = isPlanActive(plan._id);

        return (
          <div className={`subscription-card ${planIsActive ? 'unlocked-plan' : 'locked-plan'}`} key={plan._id}>
            {/* Lock Status Indicator */}
            <div className={`plan-status-badge ${planIsActive ? 'active' : 'inactive'}`}>
              {planIsActive ? (
                <>
                  <span className="status-icon">🔓</span>
                  <span className="status-text">Active</span>
                </>
              ) : (
                <>
                  <span className="status-icon">🔒</span>
                  <span className="status-text">Inactive</span>
                </>
              )}
            </div>

            <div className="plan-header">
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-price">
                <span className="currency-symbol">₹</span>
                <span className="price-value">{plan.pricing?.price}</span>
                <span className="billing-cycle">
                  /{plan.billing?.billingCycle === 'monthly' ? 'month' :
                    plan.billing?.billingCycle === 'yearly' ? 'year' :
                    plan.billing?.billingCycle === 'lifetime' ? 'lifetime' : 'month'}
                </span>
              </div>
            </div>

            <div className="plan-description">
              <p>{plan.description}</p>
            </div>

            {plan.includedCourses && plan.includedCourses.length > 0 && (
              <div className="courses-section">
                <div className="courses-header">
                  <span className="courses-title">
                    📚 {plan.includedCourses.length} Course{plan.includedCourses.length !== 1 ? 's' : ''} Included
                  </span>
                  <button
                    className="expand-toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlanExpansion(plan._id);
                    }}
                  >
                    {expandedPlan === plan._id ? 'Show Less' : 'View All'}
                  </button>
                </div>

                <div className="courses-list">
                  {expandedPlan === plan._id ? (
                    <div className="full-courses-list">
                      {plan.includedCourses.map((courseAccess, index) => (
                        <div key={index} className="course-item">
                          <span className="course-bullet">{planIsActive ? '•' : '🔒'}</span>
                          <span className={`course-name ${planIsActive ? '' : 'locked-course'}`}>
                            {courseAccess.courseName || 'Course'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="preview-courses-list">
                      {plan.includedCourses.slice(0, 2).map((courseAccess, index) => (
                        <div key={index} className="course-item">
                          <span className="course-bullet">{planIsActive ? '•' : '🔒'}</span>
                          <span className={`course-name ${planIsActive ? '' : 'locked-course'}`}>
                            {courseAccess.courseName || 'Course'}
                          </span>
                        </div>
                      ))}
                      {plan.includedCourses.length > 2 && (
                        <div className="more-courses">
                          <span>+{plan.includedCourses.length - 2} more course{plan.includedCourses.length - 2 !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {plan.features && (
              <div className="features-section">
                <div className="features-title">Features:</div>
                <div className="features-list">
                  {plan.features.certificates && (
                    <span className="feature-item">✓ Certificates of Completion</span>
                  )}
                  {plan.features.unlimitedLectures && (
                    <span className="feature-item">✓ Unlimited Lecture Access</span>
                  )}
                  {plan.features.mobileAccess && (
                    <span className="feature-item">✓ Mobile & Desktop Access</span>
                  )}
                  {plan.features.lifetimeAccess && (
                    <span className="feature-item">✓ Lifetime Access</span>
                  )}
                  {plan.features.communityAccess && (
                    <span className="feature-item">✓ Community Access</span>
                  )}
                </div>
              </div>
            )}

            <button
              className={`subscribe-button ${planIsActive ? 'view-courses-btn' : 'upgrade-btn'}`}
              onClick={(e) => {
                e.preventDefault(); // Prevent any form submission
                console.log('🔘 DASHBOARD: Button clicked!', {
                  isPlanActive,
                  planName: plan?.name,
                  planId: plan._id,
                  buttonText: planIsActive ? 'View Courses' : 'Choose This Plan',
                  isPlanPublished: isPlanPublished(plan)
                });

                // Ensure we have the plan object
                if (!plan || !plan._id) {
                  console.error('❌ Dashboard: No plan data available for button click');
                  return;
                }

                onSelectPlan(plan, planIsActive);
              }}
              disabled={false} // Temporarily enable all buttons for testing
              title={planIsActive ? 'View your courses' : 'Subscribe to this plan'}
            >
              {planIsActive ? 'View Courses' : 'Choose This Plan'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userSubscription, setUserSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    fetchUserSubscription();
  }, []);

  const fetchUserSubscription = async () => {
    try {
      setLoadingSubscription(true);
      console.log('🔐 Dashboard: Starting subscription fetch');

      const token = localStorage.getItem('token');
      if (!token) {
        console.log('⚠️ Dashboard: No token found in localStorage');
        return;
      }
      console.log('✅ Dashboard: Token found, making API request');

      const response = await axios.get('/api/subscription-plans/my-subscription', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📡 Dashboard: Subscription API response:', response.status, response.statusText);
      console.log('📊 Dashboard: Response data:', JSON.stringify(response.data, null, 2));

      if (response.data) {
        console.log('✅ Dashboard: Setting user subscription:', {
          hasSubscription: !!response.data.subscription,
          planName: response.data.subscription?.planName
        });
        setUserSubscription(response.data);
      } else {
        console.log('⚠️ Dashboard: No subscription data in response');
      }
    } catch (error) {
      console.error('❌ Dashboard: Error fetching user subscription:', error);
      console.error('❌ Dashboard: Error details:', error.response?.data || error.message);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const fetchFullPlanDetails = async (planId) => {
    try {
      console.log('📦 Dashboard: Fetching full plan details for ID:', planId);
      // Use public endpoint without auth token
      const response = await axios.get(`/api/subscription-plans/plans/${planId}`);

      if (response.data) {
        console.log('✅ Dashboard: Full plan details fetched:', {
          name: response.data.name,
          includedCoursesCount: response.data.includedCourses?.length || 0,
          hasPopulatedCourses: response.data.includedCourses?.some(course => course.courseId?.title)
        });
        return response.data;
      }
    } catch (error) {
      console.error('❌ Dashboard: Error fetching full plan details:', error);
    }
    return null;
  };

  const handleSelectPlan = async (plan, isPlanActive) => {
    console.log('🔍 Dashboard: handleSelectPlan called:', {
      planName: plan?.name,
      planId: plan?._id,
      isPlanActive,
      hasIncludedCourses: !!(plan?.includedCourses?.length > 0),
      hasPopulatedCourses: plan?.includedCourses?.some(course => course.courseId?.title),
      currentURL: window.location.href,
      navigateFunction: typeof navigate
    });

    // Ensure plan object exists and has required properties
    if (!plan || !plan._id) {
      console.error('❌ Dashboard: Invalid plan object:', plan);
      return;
    }

    console.log('✅ Dashboard: Plan validation passed');
    console.log('📊 Dashboard: Full plan structure:', JSON.stringify(plan, null, 2));

    if (isPlanActive) {
      // For active plans, fetch full plan details to ensure we have populated course data
      let fullPlanData = plan;

      // Check if plan already has populated course details
      const hasPopulatedCourses = plan.includedCourses?.some(course => course.courseId?.title);

      if (!hasPopulatedCourses) {
        console.log('🔄 Dashboard: Plan missing populated courses, fetching full details');
        fullPlanData = await fetchFullPlanDetails(plan._id);

        if (!fullPlanData) {
          console.log('⚠️ Dashboard: Could not fetch full plan details, using basic plan');
          console.log('   This might mean course details won\'t be available in the courses page');
          fullPlanData = plan;
        }
      } else {
        console.log('✅ Dashboard: Plan already has populated courses');
      }

      // Navigate to course grid/list for this plan
      console.log('🚀 Dashboard: Navigating to courses page for active plan');

      // Ensure the full plan data is clean before storing
      const cleanPlanData = {
        _id: fullPlanData._id,
        name: fullPlanData.name,
        slug: fullPlanData.slug,
        includedCourses: fullPlanData.includedCourses,
        description: fullPlanData.description
      };

      localStorage.setItem('selectedPlan', JSON.stringify(cleanPlanData));
      console.log('📦 Dashboard: Clean plan data stored in localStorage:', cleanPlanData);

      console.log('📚 Dashboard: Plan courses included in storage:');
      if (fullPlanData.includedCourses?.length > 0) {
        fullPlanData.includedCourses.forEach((course, index) => {
          console.log(`   ${index + 1}. "${course.courseId?.title || course.courseName || 'Unknown'}" (ID: ${course.courseId?._id || course.courseId || 'Unknown'})`);
        });
      }

      // Navigate to courses page
      console.log('🏃 Dashboard: Starting navigation to courses page');
      navigate('/courses');
      console.log('✅ Dashboard: Navigation initiated successfully');
    } else {
      // Navigate to payment for inactive plans
      console.log('💳 Dashboard: Navigating to payment page for inactive plan');

      // Fetch full plan details including pricing information
      let fullPlanData = plan;

      try {
        console.log('🔄 Dashboard: Fetching full plan details for payment');
        const fetchedPlanData = await fetchFullPlanDetails(plan._id);

        if (fetchedPlanData) {
          fullPlanData = { ...plan, ...fetchedPlanData };
          console.log('✅ Dashboard: Full plan details fetched for payment:', {
            name: fullPlanData.name,
            pricing: fullPlanData.pricing
          });
        }
      } catch (error) {
        console.warn('⚠️ Dashboard: Could not fetch full plan details, using basic plan:', error.message);
      }

      // Store the selected plan data for payment page
      const paymentPlanData = {
        _id: fullPlanData._id,
        name: fullPlanData.name,
        slug: fullPlanData.slug,
        pricing: fullPlanData.pricing,
        description: fullPlanData.description,
        includedCourses: fullPlanData.includedCourses,
        features: fullPlanData.features
      };

      localStorage.setItem('selectedPlan', JSON.stringify(paymentPlanData));
      console.log('📦 Dashboard: Payment plan data stored in localStorage:', paymentPlanData);

      // Navigate to payment page
      console.log('🏃 Dashboard: Starting navigation to payment page');
      navigate('/payment');
    }
  };

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

          .dashboard-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
          }

          .dashboard-header {
            text-align: center;
            margin-bottom: 40px;
          }

          .dashboard-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 3.2rem;
            background: linear-gradient(135deg, #00ff88 0%, #39ff14 50%, #00aaff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 15px;
            text-shadow: 0 0 30px rgba(0, 255, 136, 0.8);
            font-weight: 700;
            letter-spacing: 1px;
          }

          .user-greeting {
            font-family: 'Roboto', sans-serif;
            font-size: 1.5rem;
            background: linear-gradient(135deg, #00aaff 0%, #9742f5 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 30px;
            font-weight: 500;
            text-shadow: 0 0 15px rgba(0, 170, 255, 0.4);
          }

          .plans-intro {
            text-align: center;
            margin-bottom: 50px;
          }

          .intro-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 2.4rem;
            background: linear-gradient(135deg, #00ff88 0%, #39ff14 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 20px;
            font-weight: 600;
            text-shadow: 0 0 20px rgba(0, 255, 136, 0.6);
          }

          .intro-text {
            font-family: 'Roboto', sans-serif;
            font-size: 1.2rem;
            color: #e0e0e0;
            line-height: 1.7;
            max-width: 650px;
            margin: 0 auto;
            font-weight: 400;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
          }

          .subscription-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin-top: 30px;
          }

          .subscription-card {
            background: linear-gradient(145deg, #111c30 0%, #0f1626 100%);
            border: 1px solid #2a4060;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
            transition: all 0.4s ease;
            position: relative;
            overflow: hidden;
          }

          .subscription-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, #00ff88, #00aaff, #00ff88);
            border-radius: 20px 20px 0 0;
          }

          .subscription-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 25px 60px rgba(0, 255, 136, 0.15), 0 0 40px rgba(0, 255, 136, 0.1);
            border-color: #00ff88;
          }

          .plan-header {
            margin-bottom: 25px;
          }

          .plan-name {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.6rem;
            background: linear-gradient(135deg, #00ff88 0%, #39ff14 50%, #00aaff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 15px;
            font-weight: 600;
          }

          .plan-price {
            display: flex;
            align-items: baseline;
            font-family: 'Orbitron', sans-serif;
            color: #00ff88;
          }

          .currency-symbol {
            font-size: 2rem;
            margin-right: 5px;
          }

          .price-value {
            font-size: 2.5rem;
            font-weight: bold;
          }

          .billing-cycle {
            font-size: 1rem;
            color: #00aaff;
            margin-left: 8px;
          }

          .plan-description {
            margin-bottom: 25px;
          }

          .plan-description p {
            font-family: 'Roboto', sans-serif;
            color: #aaaaaa;
            line-height: 1.6;
            font-size: 0.95rem;
          }

          .courses-section {
            margin-bottom: 25px;
          }

          .courses-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }

          .courses-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 1rem;
            color: #00aaff;
          }

          .expand-toggle {
            background: transparent;
            border: 1px solid #00aaff;
            color: #00aaff;
            border-radius: 15px;
            padding: 6px 12px;
            font-family: 'Roboto', sans-serif;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .expand-toggle:hover {
            background: #00aaff;
            color: #0a1121;
          }

          .courses-list {
            max-height: 200px;
          }

          .full-courses-list,
          .preview-courses-list {
            margin-bottom: 10px;
          }

          .course-item {
            display: flex;
            align-items: center;
            padding: 4px 0;
            font-family: 'Roboto', sans-serif;
            font-size: 0.85rem;
            color: #cccccc;
          }

          .course-bullet {
            margin-right: 8px;
            color: #00ff88;
            font-size: 1rem;
          }

          .course-name {
            flex-grow: 1;
          }

          .more-courses {
            font-style: italic;
            font-size: 0.8rem;
            color: #888;
            padding-left: 20px;
          }

          .features-section {
            margin-bottom: 25px;
          }

          .features-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 0.9rem;
            color: #00ff88;
            margin-bottom: 10px;
          }

          .features-list {
            display: grid;
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .feature-item {
            font-family: 'Roboto', sans-serif;
            font-size: 0.85rem;
            color: #cccccc;
            display: flex;
            align-items: center;
          }

          .feature-item::before {
            content: '✓';
            color: #00ff88;
            font-weight: bold;
            margin-right: 8px;
          }

          .subscribe-button {
            width: 100%;
            background: linear-gradient(135deg, #00ff88 0%, #00cc6d 100%);
            color: #0a1121;
            border: none;
            border-radius: 25px;
            padding: 15px 30px;
            font-family: 'Orbitron', sans-serif;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
          }

          .subscribe-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 255, 136, 0.4);
            background: linear-gradient(135deg, #00cc6d 0%, #00ff88 100%);
          }

          .unlocked-plan {
            border-color: #00ff88 !important;
            box-shadow: 0 15px 40px rgba(0, 255, 136, 0.3) !important;
          }

          .locked-plan {
            border-color: #666 !important;
            opacity: 0.8;
          }

          .plan-status-badge {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
            text-transform: uppercase;
          }

          .plan-status-badge.active {
            background: rgba(0, 255, 136, 0.1);
            color: #00ff88;
            border: 1px solid #00ff88;
          }

          .plan-status-badge.inactive {
            background: rgba(102, 102, 102, 0.1);
            color: #cccccc;
            border: 1px solid #666;
          }

          .status-icon {
            font-size: 1rem;
          }

          .status-text {
            font-family: 'Orbitron', sans-serif;
          }

          .locked-course {
            color: #888 !important;
            text-decoration: line-through;
          }

          .upgrade-btn:disabled {
            background: #555 !important;
            cursor: not-allowed !important;
            transform: none !important;
            box-shadow: none !important;
          }

          .view-courses-btn {
            background: linear-gradient(135deg, #0066cc 0%, #0099ff 100%) !important;
          }

          .view-courses-btn:hover {
            background: linear-gradient(135deg, #004d99 0%, #0077cc 100%) !important;
          }

          .loading-spinner {
            display: inline-block;
            width: 40px;
            height: 40px;
            border: 4px solid rgba(10, 17, 33, 0.3);
            border-radius: 50%;
            border-top-color: #00ff88;
            animation: spin 1s ease-in-out infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">AIShield <span style={{color: '#00ff88'}}>India</span></h1>
          <div className="user-greeting">Welcome, {user?.name || 'Learner'}!</div>
        </div>

        {/* Introduction */}
        <div className="plans-intro">
          <h2 className="intro-title">Choose Your Learning Path</h2>
          <p className="intro-text">
            Select the perfect subscription plan that matches your cybersecurity learning journey.
            Access premium courses, hands-on training, and expert-guided content.
          </p>
        </div>

        {/* Subscription Plans Grid */}
        <SubscriptionGrid
          onSelectPlan={handleSelectPlan}
          userSubscription={userSubscription}
        />

        {/* Loading State for Subscription Fetch */}
        {loadingSubscription && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div className="loading-spinner"></div>
            <div style={{ marginTop: '10px', color: '#00ff88' }}>
              Checking subscription status...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
