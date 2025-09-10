import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  TablePagination,
  FormControlLabel,
  Checkbox,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MonetizationOn as SubscriptionIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import axios from 'axios';
import SubscriptionPlanForm from './SubscriptionPlanForm';

const SubscriptionPlanManagement = () => {
  const [plans, setPlans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPlans, setTotalPlans] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [publishing, setPublishing] = useState(null); // ID of plan being published/unpublished

  useEffect(() => {
    fetchPlans();
    fetchCourses();
  }, [page, rowsPerPage, searchTerm, statusFilter]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter,
        search: searchTerm
      });

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const data = (await axios.get(`/api/subscription-plans/admin/plans?${queryParams}`)).data;
      console.log('📡 Frontend: Fetched plans from server:', {
        total: data.pagination?.total,
        plansCount: data.plans?.length,
        plans: data.plans?.map(plan => ({
          id: plan._id,
          name: plan.name,
          published: plan.published
        }))
      });

      setPlans(data.plans || []);
      setTotalPlans(data.pagination?.total || 0);

      // Log specific plan we're watching for updates (if any)
      if (publishing) {
        const targetPlan = data.plans?.find(plan => plan._id === publishing);
        if (targetPlan) {
          console.log('🎯 Frontend: Target plan status from server:', {
            id: targetPlan._id,
            published: targetPlan.published
          });
        }
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError(`Failed to load subscription plans: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch('/api/courses/admin/courses?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Courses API Error Response:', errorText);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Fetched courses:', data);
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError(`Failed to load courses for selection: ${error.message}`);
    }
  };

  const handlePublishToggle = async (planId, published) => {
    setPublishing(planId); // Set loading state for this specific plan
    setError(''); // Clear previous errors
    setSuccess(''); // Clear previous success messages

    try {
      console.log(`🔄 Publishing plan ${planId}: ${published ? 'publishing' : 'unpublishing'}`);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You are not logged in as an admin. Please log in again.');
      }

      const response = await fetch(`/api/subscription-plans/admin/plans/${planId}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ published })
      });

      console.log('📡 Publish response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Publish request failed:', response.status, errorText);

        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again as an admin.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to modify subscription plans.');
        } else if (response.status === 404) {
          throw new Error('Subscription plan not found.');
        } else {
          throw new Error(errorText || `Failed to ${published ? 'publish' : 'unpublish'} plan`);
        }
      }

      const result = await response.json();
      console.log('✅ Publish successful:', result);

      // Update local state immediately for better UX
      console.log('📝 Frontend: Updating local state...');
      setPlans(prevPlans => {
        const updatedPlans = prevPlans.map(plan => {
          if (plan._id === planId) {
            console.log('📝 Frontend: Found plan to update:', {
              id: plan._id,
              oldPublished: plan.business?.isActive && plan.business?.isVisible,
              newPublished: published
            });

            // Update the business fields that control published status
            return {
              ...plan,
              business: {
                ...plan.business,
                isActive: Boolean(published),
                isVisible: Boolean(published)
              }
            };
          }
          return plan;
        });

        console.log('📝 Frontend: Local state updated, now looking for the updated plan:');
        const updatedPlan = updatedPlans.find(plan => plan._id === planId);
        if (updatedPlan) {
          console.log('✅ Frontend: Plan status after local update:', {
            id: updatedPlan._id,
            isActive: updatedPlan.business?.isActive,
            isVisible: updatedPlan.business?.isVisible,
            isPublished: updatedPlan.business?.isActive && updatedPlan.business?.isVisible
          });
        }
        return updatedPlans;
      });

      const actionText = published ? 'published' : 'unpublished';
      console.log('🎉 Frontend: Setting success message:', `Plan successfully ${actionText}!`);
      setSuccess(`Plan successfully ${actionText}!`);

      // Refresh plans from server to ensure data consistency
      console.log('🔄 Frontend: Scheduling server refresh in 500ms...');
      setTimeout(() => {
        console.log('🔄 Frontend: Refreshing plans from server...');
        fetchPlans();
      }, 500);

    } catch (error) {
      console.error('❌ Error toggling publish status:', error);

      // More specific error messages for different scenarios
      let errorMessage = error.message;
      if (error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Response format error. Please try again.';
      }

      setError(`Failed to ${published ? 'publish' : 'unpublish'} plan: ${errorMessage}`);
    } finally {
      setPublishing(null); // Clear loading state
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
      const response = await fetch(`/api/subscription-plans/admin/plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete subscription plan');

      await fetchPlans();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting plan:', error);
      setError('Failed to delete subscription plan');
    }
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading subscription plans...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      p: 3,
      '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
      }
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center' }}>
          <SubscriptionIcon sx={{ mr: 2, color: 'primary.main' }} />
          Subscription Plan Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ minWidth: 140, bgcolor: 'primary.main' }}
        >
          Create Plan
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e8' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <SubscriptionIcon sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {totalPlans}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Plans
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                ₹{plans.reduce((sum, plan) => {
                  const price = plan.pricing ? plan.pricing.price : plan.monthlyPrice;
                  return sum + (price || 0);
                }, 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monthly Revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 250 }}
          />

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Plans Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Plan Name</TableCell>
              <TableCell>Pricing</TableCell>
              <TableCell>Courses</TableCell>
              <TableCell>Subscribers</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan._id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {plan.name}
                    </Typography>
                    {plan.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {plan.description.slice(0, 50)}...
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {plan.pricing && (
                    <Typography variant="body2" fontWeight="medium">
                      ₹{plan.pricing.price}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${plan.includedCourses?.length || 0} courses`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${plan.subscribersCount || 0} users`}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={plan.business?.isActive && plan.business?.isVisible ? 'Published' : 'Draft'}
                    size="small"
                    color={plan.business?.isActive && plan.business?.isVisible ? 'success' : 'default'}
                    variant={plan.business?.isActive && plan.business?.isVisible ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => {
                setSelectedPlan(plan);
                setOpenDialog(true);
              }}
              color="primary"
              title="Edit Plan"
            >
              <EditIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handlePublishToggle(plan._id, !(plan.business?.isActive && plan.business?.isVisible))}
              disabled={publishing === plan._id}
              color={publishing === plan._id ? 'default' : ((plan.business?.isActive && plan.business?.isVisible) ? 'warning' : 'success')}
              title={
                publishing === plan._id
                  ? `${(plan.business?.isActive && plan.business?.isVisible) ? 'Unpublishing' : 'Publishing'}...`
                  : (plan.business?.isActive && plan.business?.isVisible)
                    ? 'Unpublish'
                    : 'Publish'
              }
            >
              {publishing === plan._id ? (
                <Box
                  sx={{
                    width: '20px !important',
                    height: '20px !important',
                    border: '2px solid #ccc',
                    borderTopColor: plan.published ? '#f44336' : '#4caf50',
                    borderRadius: '50%',
                    animation: 'spin 0.5s linear infinite'
                  }}
                />
              ) : (
                <SubscriptionIcon />
              )}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setDeleteConfirm(plan)}
              color="error"
              title="Delete Plan"
            >
              <DeleteIcon />
            </IconButton>
          </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={totalPlans}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </TableContainer>

      {/* Plan Form Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setSelectedPlan(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
        </DialogTitle>
        <DialogContent>
          <SubscriptionPlanForm
            plan={selectedPlan}
            courses={courses}
            createdBy={(() => {
              const token = localStorage.getItem('token');
              if (token) {
                try {
                  const payload = JSON.parse(atob(token.split('.')[1]));
                  return payload.userId;
                } catch (e) {
                  console.warn('Error decoding token:', e.message);
                }
              }
              return null;
            })()}
            onSubmit={async (planData) => {
              try {
                const isUpdate = !!selectedPlan;
                const method = isUpdate ? 'PUT' : 'POST';
                const url = isUpdate ? `/api/subscription-plans/admin/plans/${selectedPlan._id}` : `/api/subscription-plans/admin/plans`;

                console.log(`🚀 ${isUpdate ? 'UPDATE' : 'CREATE'} REQUEST:`, {
                  url, method,
                  planId: selectedPlan?._id,
                  hasToken: !!localStorage.getItem('token')
                });

                const response = await fetch(url, {
                  method: method,
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify(planData)
                });

                console.log('📡 API Response:', {
                  status: response.status,
                  ok: response.ok,
                  statusText: response.statusText
                });

                if (!response.ok) {
                  const error = await response.text();
                  throw new Error(error);
                }

                const result = await response.json();
                setSuccess(`Subscription plan ${selectedPlan ? 'updated' : 'created'} successfully!`);

                setOpenDialog(false);
                setSelectedPlan(null);
                await fetchPlans();
              } catch (error) {
                console.error('Error saving subscription plan:', error);
                // Handle specific error messages more gracefully
                let errorMessage = error.message;

                if (errorMessage.includes('course IDs')) {
                  errorMessage = 'Some selected courses could not be validated. Please ensure all courses still exist and try again.';
                } else if (errorMessage.includes('No course IDs provided')) {
                  errorMessage = 'Please select at least one course for this plan.';
                } else if (errorMessage.includes('exist')) {
                  errorMessage = 'Some selected courses may have been deleted. Please refresh and select your courses again.';
                }

                setError(`Failed to ${selectedPlan ? 'update' : 'create'} subscription plan: ${errorMessage}`);

                // If it's a course validation error, refresh the courses list
                if (errorMessage.includes('course')) {
                  await fetchCourses();
                }
              }
            }}
            onCancel={() => {
              setOpenDialog(false);
              setSelectedPlan(null);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            setSelectedPlan(null);
          }}>
            Cancel
          </Button>
          <Button variant="contained">
            {selectedPlan ? 'Update' : 'Create'} Plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the subscription plan "{deleteConfirm?.name}"?
            This will archive the plan, but subscriber history will be preserved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirm && handleDeletePlan(deleteConfirm._id)}
          >
            Delete Plan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubscriptionPlanManagement;
