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
  Avatar,
  Button,
  Chip,
  Divider,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  Security as SecurityIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userSubscription, setUserSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ name: '', email: '' });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserSubscription();
    }
  }, [user]);

  const fetchUserSubscription = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('/api/subscription-plans/my-subscription', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setUserSubscription(response.data);
      }
    } catch (error) {
      console.error('Error fetching user subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpen = () => {
    setEditData({
      name: user?.name || '',
      email: user?.email || ''
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');

      const response = await axios.put('/api/auth/profile', editData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reload page to update user context
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setUpdating(false);
      setEditOpen(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');

      await axios.delete('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Clear local storage and redirect
      localStorage.removeItem('token');
      navigate('/register');
    } catch (error) {
      console.error('Error deleting account:', error);
      setError('Failed to delete account');
    } finally {
      setUpdating(false);
      setDeleteOpen(false);
    }
  };

  const getSubscriptionStatus = () => {
    if (!userSubscription?.subscription) return 'No Active Subscription';

    const sub = userSubscription.subscription;
    const now = new Date();
    const expiry = new Date(sub.expiresAt);

    if (sub.status === 'completed' && expiry > now) {
      return 'Active';
    } else if (sub.status === 'pending') {
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
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{
            background: 'linear-gradient(135deg, #00ff88 0%, #39ff14 50%, #9742f5 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            textShadow: '0 0 20px rgba(0, 255, 136, 0.6)',
            mb: 2
          }}>
            My Profile
          </Typography>
          <Typography variant="h6" sx={{
            color: '#b8b8b8',
            fontWeight: 400,
            textShadow: '0 0 10px rgba(255, 255, 255, 0.1)',
            lineHeight: 1.6
          }}>
            Manage your account details and subscription
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* User Info Card */}
        <Card sx={{ mb: 3, background: 'linear-gradient(145deg, #111c30 0%, #0f1626 100%)', color: 'white' }}>
          <CardContent>
            <Stack direction="row" spacing={3} alignItems="center">
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: '#00ff88',
                  fontSize: '2rem'
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>

              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" gutterBottom>
                  {user?.name || 'User'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <EmailIcon fontSize="small" color="primary" />
                  <Typography color="text.secondary">{user?.email}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon fontSize="small" color="primary" />
                  <Typography color="text.secondary">
                    Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEditOpen}
                sx={{
                  color: '#00ff88',
                  borderColor: '#00ff88',
                  '&:hover': {
                    bgcolor: '#00ff88',
                    color: 'black'
                  }
                }}
              >
                Edit Profile
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Subscription Info Card */}
        <Card sx={{ mb: 3, background: 'linear-gradient(145deg, #111c30 0%, #0f1626 100%)', color: 'white' }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon /> Subscription Details
            </Typography>

            {userSubscription?.subscription ? (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1" color="text.secondary">Plan</Typography>
                  <Typography variant="h6">
                    {userSubscription.subscription.planName || 'Unknown Plan'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1" color="text.secondary">Status</Typography>
                  <Chip
                    label={getSubscriptionStatus()}
                    color={getStatusColor(getSubscriptionStatus())}
                    variant="filled"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1" color="text.secondary">Valid Until</Typography>
                  <Typography variant="h6">
                    {new Date(userSubscription.subscription.expiresAt).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1" color="text.secondary">Amount Paid</Typography>
                  <Typography variant="h6">
                    ₹{userSubscription.subscription.price || 0}
                  </Typography>
                </Grid>
              </Grid>
            ) : (
              <Typography>No active subscription found.</Typography>
            )}
          </CardContent>
        </Card>

        {/* Account Management */}
        <Card sx={{ background: 'linear-gradient(145deg, #111c30 0%, #0f1626 100%)', color: 'white' }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ color: '#ff6666', display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon /> Account Management
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<EditIcon />}
                  fullWidth
                  onClick={handleEditOpen}
                >
                  Update Profile
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  fullWidth
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete Account
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Container>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={editData.email}
            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            onClick={handleEditSave}
            disabled={updating}
            startIcon={updating ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {updating ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle sx={{ color: '#ff6666' }}>Delete Account</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to delete your account? This action cannot be undone.
          </Typography>
          <Typography color="error" variant="body2">
            All your data, including subscription history, will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            disabled={updating}
            startIcon={updating ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {updating ? 'Deleting...' : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Profile;