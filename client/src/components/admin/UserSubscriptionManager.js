import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Card,
  CardContent,
  Divider,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Subscriptions as SubscriptionIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import axios from 'axios';

const UserSubscriptionManager = ({ user, open, onClose, onSubscriptionGranted, onSubscriptionRevoked }) => {
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [customExpiry, setCustomExpiry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open) {
      loadSubscriptionPlans();
    }
  }, [open]);

  const loadSubscriptionPlans = async () => {
    try {
      console.log('📋 LOAD PLANS: Starting to load subscription plans...');
      setLoading(true);

      // Get token using correct key from AuthContext
      const token = localStorage.getItem('token');
      console.log('📋 LOAD PLANS: Token from localStorage:', token ? 'Token exists' : 'No token');
      console.log('📋 LOAD PLANS: Token length:', token ? token.length : 0);

      if (!token) {
        console.error('❌ LOAD PLANS ERROR: No authentication token found');
        setError('Authentication failed. Please login again.');
        setLoading(false);
        return;
      }

      // Decode token to verify it's valid and get user info
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('📋 LOAD PLANS: Token payload:', {
          hasUserId: !!payload.userId,
          has_id: !!payload._id,
          exp: payload.exp,
          role: payload.role,
          iat: payload.iat
        });

        // Check if token is expired
        const currentTime = Date.now() / 1000;
        if (payload.exp && payload.exp < currentTime) {
          console.error('❌ LOAD PLANS ERROR: Token is expired');
          console.error('Token expired at:', new Date(payload.exp * 1000).toISOString());
          console.error('Current time:', new Date(currentTime * 1000).toISOString());
          localStorage.removeItem('token');
          setError('Session expired. Please login again.');
          setLoading(false);
          return;
        }

        console.log('📋 LOAD PLANS: Token is valid and current');
      } catch (decodeError) {
        console.error('❌ LOAD PLANS ERROR: Failed to decode token:', decodeError);
        localStorage.removeItem('token');
        setError('Invalid authentication token. Please login again.');
        setLoading(false);
        return;
      }

      console.log('📋 LOAD PLANS: Making authenticated request...');

      // Make request with proper authentication headers
      const response = await axios.get('/api/subscription-plans/admin/plans', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ LOAD PLANS: Request successful!');
      console.log('📋 LOAD PLANS: Full API Response:', response);
      console.log('📋 LOAD PLANS: Response data:', response.data);
      console.log('📋 LOAD PLANS: Plans array:', response.data.plans);

      const plans = response.data.plans || [];
      console.log('📋 LOAD PLANS: Final plans to set in state:', plans);
      console.log('📋 LOAD PLANS: Number of plans:', plans.length);

      setSubscriptionPlans(plans);
      setError('');

      console.log('✅ LOAD PLANS: Plans set in component state successfully');
    } catch (error) {
      console.error('❌ LOAD PLANS ERROR: Error loading subscription plans:', error);

      if (error.response) {
        console.error('❌ LOAD PLANS ERROR: Response status:', error.response.status);
        console.error('❌ LOAD PLANS ERROR: Response data:', error.response.data);

        // Handle authentication errors specifically
        if (error.response.status === 401) {
          setError(`Authentication failed: Please login again. Status: ${error.response.status}`);
          localStorage.removeItem('token');
          console.error('❌ LOAD PLANS ERROR: 401 Unauthorized - clearing token and notifying user');
        } else if (error.response.status === 403) {
          setError(`Access denied: Admin privileges required. Status: ${error.response.status}`);
          console.error('❌ LOAD PLANS ERROR: 403 Forbidden - user is not admin');
        } else {
          setError(`Failed to load plans: ${error.response.data.message || 'Server error'}`);
        }
      } else if (error.request) {
        console.error('❌ LOAD PLANS ERROR: Network error - no response received');
        console.error('Request details:', error.request);
        setError('Network error: Unable to connect to server. Check your internet connection.');
      } else {
        console.error('❌ LOAD PLANS ERROR: Request setup error:', error.message);
        setError(`Request error: ${error.message || 'Unable to setup API request'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGrantSubscription = async () => {
    if (!selectedPlanId) {
      setError('Please select a subscription plan');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const grantData = {
        planId: selectedPlanId,
        customExpiry: customExpiry || null
      };

      const response = await axios.post(`/api/admin/users/${user._id}/grant-subscription`, grantData);

      const result = response.data;
      setSuccess('Subscription granted successfully');

      // Debug logging
      console.log('✅ SUBSCRIPTION GRANT RESPONSE:', {
        message: result.message,
        user: result.user,
        debug: result.debug,
        fullResponse: result
      });

      console.log('🔍 UPDATED USER OBJECT:', result.user);
      console.log('🔍 SUBSCRIPTION DATA:', result.user.subscription);

      // Update the user object locally to reflect immediate changes
      if (onSubscriptionGranted) {
        console.log('🔄 Triggering onSubscriptionGranted callback with:', result.user);
        onSubscriptionGranted(result.user, result.user.subscription);
      }

      // Log success for debugging
      console.log('✅ Subscription granted successfully:', result);

      // Reset form
      setSelectedPlanId('');
      setCustomExpiry('');
    } catch (error) {
      console.error('Error granting subscription:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSubscription = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (!window.confirm(`Are you sure you want to revoke ${user.name}'s subscription?`)) {
        return;
      }

      const response = await axios.post(`/api/admin/users/${user._id}/revoke-subscription`);

      const result = response.data;
      setSuccess('Subscription revoked successfully');
      if (onSubscriptionRevoked) {
        onSubscriptionRevoked(result.user);
      }
    } catch (error) {
      console.error('Error revoking subscription:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const selectedPlan = subscriptionPlans.find(plan => plan._id === selectedPlanId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon />
        Manage Subscription for {user?.name}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {/* DEBUG INFO */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Debug Info:</strong><br/>
            - User Subscription: {user?.subscription ? 'HAS' : 'NO'} active subscription<br/>
            - Available Plans: {subscriptionPlans.length} ({subscriptionPlans.filter(plan => plan.published).length} published)<br/>
            - Selected Plan ID: {selectedPlanId}<br/>
          </Alert>

          {/* User Information */}
          <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">{user?.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={user?.subscription ? 'Active Subscription' : 'Free User'}
                      color={user?.subscription ? 'success' : 'default'}
                      size="small"
                      sx={{
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        boxShadow: user?.subscription ? '0 2px 8px rgba(76, 175, 80, 0.3)' : 'none'
                      }}
                    />
                    {user?.role === 'admin' && (
                      <Chip
                        label="Admin"
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    )}
                    {user?.subscription && (
                      <Chip
                        label="Paid User"
                        color="secondary"
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Quick Stats */}
                {user?.subscription && (
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {formatCurrency(user.subscription.price)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.subscription.billingCycle === 'monthly' ? '/month' : '/year'}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Enhanced Current Subscription Section */}
          {user?.subscription && (
            <Card sx={{ mb: 3, border: '2px solid', borderColor: 'success.main', bgcolor: '#f8f9fa' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h5" sx={{ color: '#2e7d32', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SubscriptionIcon />
                    ACTIVE SUBSCRIPTION DETAILS
                  </Typography>
                  <Chip
                    label={user.subscription.status || 'Active'}
                    color="success"
                    sx={{
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                      px: 2
                    }}
                  />
                </Box>

                <Grid container spacing={2}>
                  {/* Main Subscription Info - Large Cards */}
                  <Grid item xs={12} sm={6} lg={3}>
                    <Card
                      sx={{
                        bgcolor: 'white',
                        border: '2px solid #1976d2',
                        borderRadius: 2,
                        height: '100%',
                        transition: 'all 0.3s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Box sx={{ mb: 2 }}>
                          <SubscriptionIcon sx={{ fontSize: 32, color: '#1976d2' }} />
                        </Box>
                        <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 'bold', mb: 1 }}>
                          {user.subscription.planName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Current Plan
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} lg={3}>
                    <Card
                      sx={{
                        bgcolor: 'white',
                        border: '2px solid #f57c00',
                        borderRadius: 2,
                        height: '100%',
                        transition: 'all 0.3s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Box sx={{ mb: 2 }}>
                          <CalendarIcon sx={{ fontSize: 32, color: '#f57c00' }} />
                        </Box>
                        <Typography variant="h5" sx={{ color: '#f57c00', fontWeight: 'bold', mb: 1 }}>
                          {formatDate(user.subscription.endDate)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Expiry Date
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} lg={3}>
                    <Card
                      sx={{
                        bgcolor: 'white',
                        border: '2px solid #388e3c',
                        borderRadius: 2,
                        height: '100%',
                        transition: 'all 0.3s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Box sx={{ mb: 2 }}>
                          <MoneyIcon sx={{ fontSize: 32, color: '#388e3c' }} />
                        </Box>
                        <Typography variant="h5" sx={{ color: '#388e3c', fontWeight: 'bold', mb: 1 }}>
                          {formatCurrency(user.subscription.price)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Amount Paid
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({user.subscription.billingCycle || 'monthly'})
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} lg={3}>
                    <Card
                      sx={{
                        bgcolor: 'white',
                        border: '2px solid #9c27b0',
                        borderRadius: 2,
                        height: '100%',
                        transition: 'all 0.3s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Box sx={{ mb: 2 }}>
                          {user.subscription.isExpired ? (
                            <CancelIcon sx={{ fontSize: 32, color: '#f44336' }} />
                          ) : (
                            <CheckCircleIcon sx={{ fontSize: 32, color: '#4caf50' }} />
                          )}
                        </Box>
                        <Typography variant="h5" sx={{
                          color: user.subscription.isExpired ? '#f44336' : '#4caf50',
                          fontWeight: 'bold',
                          mb: 1
                        }}>
                          {user.subscription.isExpired ? 'Expired' : 'Active'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Status
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                          Started: {formatDate(user.subscription.startDate)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Additional Details */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                    Subscription Summary
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                        <Typography variant="body2" color="text.secondary">Payment ID:</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {user.subscription.paymentId || 'N/A'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                        <Typography variant="body2" color="text.secondary">Currency:</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {user.subscription.currency || 'INR'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* Revoke Button */}
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleRevokeSubscription}
                    disabled={loading}
                    startIcon={<CancelIcon />}
                    size="large"
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontWeight: 'bold',
                      boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
                      '&:hover': {
                        boxShadow: '0 6px 16px rgba(244, 67, 54, 0.4)'
                      }
                    }}
                  >
                    {loading ? 'Revoking...' : 'REVOKE SUBSCRIPTION'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Plan Selection - Always show for admins */}
          {user?.subscription && (
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SubscriptionIcon />
              Change/Update Subscription Plan
            </Typography>
          )}

          {!user?.subscription && (
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SubscriptionIcon />
              Grant New Subscription
            </Typography>
          )}

          {(user?.subscription || !user?.subscription) && (
            <>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Subscription Plan *</InputLabel>
                <Select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  label="Select Subscription Plan *"
                >
                  {subscriptionPlans
                    .filter(plan => plan.published)
                    .map((plan) => (
                      <MenuItem key={plan._id} value={plan._id}>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {plan.name} - {formatCurrency(plan.pricing.price)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {plan.includedCourses?.length || 0} courses • {plan.duration || 30} days
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              {/* Selected Plan Details */}
              {selectedPlan && (
                <Card sx={{ mb: 2, border: '2px solid', borderColor: 'primary.main' }}>
                  <CardContent>
                    <Typography variant="h6" color="primary.main" sx={{ mb: 1 }}>
                      {selectedPlan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {selectedPlan.description}
                    </Typography>

                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" fontWeight="medium">
                          Price: {formatCurrency(selectedPlan.pricing.price)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" fontWeight="medium">
                          Courses: {selectedPlan.includedCourses?.length || 0}
                        </Typography>
                      </Grid>
                    </Grid>

                    {selectedPlan.includedCourses && selectedPlan.includedCourses.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                          Included Courses:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {selectedPlan.includedCourses.slice(0, 3).map((courseAccess, idx) => (
                            <Chip
                              key={idx}
                              label={courseAccess.courseName || 'Course'}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          ))}
                          {selectedPlan.includedCourses.length > 3 && (
                            <Chip
                              label={`+${selectedPlan.includedCourses.length - 3} more`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Custom Expiry (Optional) */}
              <TextField
                fullWidth
                type="datetime-local"
                label="Custom Expiry Date (Optional)"
                value={customExpiry}
                onChange={(e) => setCustomExpiry(e.target.value)}
                sx={{ mb: 2 }}
                helperText="Leave empty to use plan's default duration"
                InputLabelProps={{
                  shrink: true,
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleGrantSubscription}
                  disabled={loading || !selectedPlanId}
                  startIcon={<CheckIcon />}
                  size="large"
                >
                  {loading ? 'Granting...' : 'Grant Subscription'}
                </Button>
              </Box>
            </>
          )}
        </Box>

        {/* Action buttons */}
        <DialogActions>
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export default UserSubscriptionManager;
