import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert,
  Stack,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Security as SecurityIcon,
  CalendarMonth as CalendarIcon,
  CurrencyRupee as CurrencyIcon,
  Book as BookIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Upgrade as UpgradeIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const SubscriptionInfo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('/api/subscription-plans/my-subscription', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setSubscription(response.data.subscription);
        setPlan(response.data.plan);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionStatus = () => {
    if (!subscription) return 'No Active Subscription';

    const now = new Date();
    const expiry = new Date(subscription.expiresAt);

    if (subscription.status === 'completed' && expiry > now) {
      return 'Active';
    } else if (subscription.status === 'pending') {
      return 'Payment Pending';
    } else if (expiry <= now) {
      return 'Expired';
    } else {
      return 'Inactive';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Payment Pending': return 'warning';
      case 'Expired': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
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
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{
              color: '#00ff88',
              borderColor: '#00ff88',
              '&:hover': {
                bgcolor: '#00ff88',
                color: 'black'
              }
            }}
          >
            Back to Dashboard
          </Button>
          <Typography variant="h3" component="h1" sx={{
            flex: 1,
            background: 'linear-gradient(135deg, #00ff88 0%, #39ff14 50%, #9742f5 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            textShadow: '0 0 20px rgba(0, 255, 136, 0.6)'
          }}>
            My Subscription
          </Typography>
        </Stack>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {subscription ? (
          <>
            {/* Current Subscription Status Card */}
            <Card sx={{ mb: 3, background: 'linear-gradient(145deg, #111c30 0%, #0f1626 100%)', color: 'white' }}>
              <CardContent>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography variant="h4" gutterBottom sx={{ color: '#00ff88' }}>
                      {subscription.planName || 'Subscription Plan'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                      {plan?.description || 'Your active subscription plan'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                      <Chip
                        label={getSubscriptionStatus()}
                        color={getStatusColor(getSubscriptionStatus())}
                        size="large"
                        sx={{ mb: 2, fontSize: '1rem', fontWeight: 'bold' }}
                      />
                      <Typography variant="h4" sx={{ color: '#00ff88' }}>
                        ₹{subscription.price || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {subscription.billingCycle === 'yearly' ? 'per year' : 'per month'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Subscription Details */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ background: 'linear-gradient(145deg, #111c30 0%, #0f1626 100%)', color: 'white', height: '100%' }}>
                  <CardContent>
                    <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon /> Subscription Timeline
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon sx={{ color: '#00ff88' }}>
                          <CheckIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary="Subscribed On"
                          secondary={new Date(subscription.subscribedAt || subscription.createdAt).toLocaleDateString('en-IN')}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon sx={{ color: subscription.status === 'completed' ? '#00ff88' : '#ff6666' }}>
                          {subscription.status === 'completed' ? <CheckIcon /> : <CancelIcon />}
                        </ListItemIcon>
                        <ListItemText
                          primary="Status"
                          secondary={getSubscriptionStatus()}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon sx={{ color: '#00ff88' }}>
                          <CalendarIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary="Valid Until"
                          secondary={new Date(subscription.expiresAt).toLocaleDateString('en-IN')}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ background: 'linear-gradient(145deg, #111c30 0%, #0f1626 100%)', color: 'white', height: '100%' }}>
                  <CardContent>
                    <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BookIcon /> Subscription Benefits
                    </Typography>
                    {plan?.includedCourses && plan.includedCourses.length > 0 ? (
                      <List>
                        {plan.includedCourses.map((courseAccess, index) => (
                          <ListItem key={index}>
                            <ListItemIcon sx={{ color: '#00ff88' }}>
                              <BookIcon />
                            </ListItemIcon>
                            <ListItemText primary={courseAccess.courseName || 'Course'} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography color="text.secondary">
                        No course access details available.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Plan Features */}
            {plan?.features && (
              <Card sx={{ mt: 3, background: 'linear-gradient(145deg, #111c30 0%, #0f1626 100%)', color: 'white' }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    Plan Features
                  </Typography>
                  <Grid container spacing={2}>
                    {plan.features.certificates && (
                      <Grid item xs={6} sm={3}>
                        <Chip label="Certificates" color="primary" variant="outlined" sx={{ width: '100%' }} />
                      </Grid>
                    )}
                    {plan.features.unlimitedLectures && (
                      <Grid item xs={6} sm={3}>
                        <Chip label="Unlimited Lectures" color="primary" variant="outlined" sx={{ width: '100%' }} />
                      </Grid>
                    )}
                    {plan.features.mobileAccess && (
                      <Grid item xs={6} sm={3}>
                        <Chip label="Mobile Access" color="primary" variant="outlined" sx={{ width: '100%' }} />
                      </Grid>
                    )}
                    {plan.features.lifetimeAccess && (
                      <Grid item xs={6} sm={3}>
                        <Chip label="Lifetime Access" color="primary" variant="outlined" sx={{ width: '100%' }} />
                      </Grid>
                    )}
                    {plan.features.communityAccess && (
                      <Grid item xs={6} sm={3}>
                        <Chip label="Community Access" color="primary" variant="outlined" sx={{ width: '100%' }} />
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Management Actions */}
            <Card sx={{ mt: 3, background: 'linear-gradient(145deg, #111c30 0%, #0f1626 100%)', color: 'white' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Subscription Management
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<UpgradeIcon />}
                    onClick={() => navigate('/dashboard')}
                  >
                    View All Plans
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => navigate('/profile')}
                  >
                    Account Settings
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </>
        ) : (
          /* No Subscription Card */
          <Card sx={{ background: 'linear-gradient(145deg, #111c30 0%, #0f1626 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <SecurityIcon sx={{ fontSize: 64, color: '#666', mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                No Active Subscription
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                You don't have an active subscription. Choose a plan to start learning.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<UpgradeIcon />}
                onClick={() => navigate('/dashboard')}
              >
                View Subscription Plans
              </Button>
            </CardContent>
          </Card>
        )}
      </Container>
    </div>
  );
};

export default SubscriptionInfo;