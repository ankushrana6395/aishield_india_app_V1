import React, { useState, useEffect, useCallback } from 'react';
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
  Typography,
  IconButton,
  TablePagination,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Fab,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Archive as ArchiveIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Book as BookIcon,
  People as PeopleIcon,
  MonetizationOn as MonetizationIcon
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import SubscriptionPlanForm from './SubscriptionPlanForm';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Enterprise Subscription Plan Management Component
 *
 * Professional admin interface for comprehensive subscription plan management
 * with advanced features, analytics, and data visualization
 */
const SubscriptionPlanManager = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Core data states
  const [plans, setPlans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // UI states
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Pagination states
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPlans, setTotalPlans] = useState(0);

  // Filter and search states
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    minPrice: '',
    maxPrice: '',
    skillLevel: '',
    billingCycle: ''
  });

  // Processing states
  const [processingId, setProcessingId] = useState(null);

  // ============================================================================
  // AUTHENTICATION & API SETUP
  // ============================================================================

  const { user } = useAuth();

  const apiClient = axios.create({
    baseURL: '/api/v1',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add authentication headers to all requests
  useEffect(() => {
    if (user?.token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
    }
  }, [user?.token]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  /**
   * Fetch subscription plans with filters and pagination
   */
  const fetchPlans = useCallback(async (loader = true) => {
    if (loader) setLoading(true);

    try {
      const params = new URLSearchParams({
        page: page + 1,
        limit: pageSize,
        ...filters
      });

      // Remove empty filters
      Object.keys(filters).forEach(key => {
        if (!filters[key] || filters[key] === 'all') {
          params.delete(key);
        }
      });

      const response = await apiClient.get(`/subscription-plans/admin/plans?${params}`);
      const { plans: planData, pagination } = response.data.data;

      setPlans(planData);
      setTotalPlans(pagination.total);
      setPage(pagination.currentPage - 1);

    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to load subscription plans';
      setSnackbar({
        open: true,
        message,
        severity: 'error'
      });
    } finally {
      if (loader) setLoading(false);
    }
  }, [page, pageSize, filters, apiClient]);

  /**
   * Fetch available courses
   */
  const fetchCourses = useCallback(async () => {
    try {
      const response = await apiClient.get('/courses/admin/courses?limit=500');
      setCourses(response.data.courses || []);
    } catch (error) {
      console.warn('Failed to load courses:', error.message);
    }
  }, [apiClient]);

  /**
   * Fetch analytics data
   */
  const fetchAnalytics = useCallback(async () => {
    try {
      const [planAnalyticsResponse, subscriptionAnalyticsResponse] = await Promise.all([
        apiClient.get('/subscription-plans/admin/plans-analytics'),
        apiClient.get('/subscription-plans/admin/subscription-analytics')
      ]);

      setAnalytics({
        plans: planAnalyticsResponse.data.data,
        subscriptions: subscriptionAnalyticsResponse.data.data
      });
    } catch (error) {
      console.warn('Failed to load analytics:', error.message);
    }
  }, [apiClient]);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    fetchPlans();
    fetchCourses();
    fetchAnalytics();
  }, [fetchPlans, fetchCourses, fetchAnalytics]);

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  /**
   * Handle plan creation/update
   */
  const handlePlanSubmit = async (planData) => {
    setProcessingId('form-submit');

    try {
      const isUpdate = !!selectedPlan;
      const method = isUpdate ? 'put' : 'post';
      const url = isUpdate
        ? `/subscription-plans/admin/plans/${selectedPlan._id}`
        : `/subscription-plans/admin/plans`;

      const response = await apiClient[method](url, planData);
      const { data, message } = response.data;

      setSnackbar({
        open: true,
        message,
        severity: 'success'
      });

      setDialogOpen(false);
      setSelectedPlan(null);

      // Refresh data
      await Promise.all([
        fetchPlans(false),
        fetchAnalytics()
      ]);

    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to save plan';
      setSnackbar({
        open: true,
        message,
        severity: 'error'
      });
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Handle plan deletion (soft delete)
   */
  const handleDeletePlan = async (planId) => {
    setProcessingId(planId);

    try {
      const response = await apiClient.delete(`/subscription-plans/admin/plans/${planId}`);
      const { message } = response.data;

      setSnackbar({
        open: true,
        message,
        severity: 'success'
      });

      await fetchPlans(false);
      setConfirmDelete(null);

    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to delete plan';
      setSnackbar({
        open: true,
        message,
        severity: 'error'
      });
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Handle plan publish/unpublish toggle
   */
  const handlePublishToggle = async (planId, newStatus) => {
    setProcessingId(`publish-${planId}`);

    try {
      const response = await apiClient.patch(
        `/subscription-plans/admin/plans/${planId}/publish`,
        { published: newStatus }
      );

      const { message } = response.data;
      setSnackbar({
        open: true,
        message,
        severity: 'success'
      });

      await fetchPlans(false);

    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to update plan status';
      setSnackbar({
        open: true,
        message,
        severity: 'error'
      });
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================================================
  // UI EVENT HANDLERS
  // ============================================================================

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (event) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(0); // Reset to first page when filtering
  };

  const handleSearch = (value) => {
    handleFilterChange('search', value);
  };

  // ============================================================================
  // RENDERING HELPERS
  // ============================================================================

  const getStatusColor = (status) => {
    const colors = {
      published: 'success',
      draft: 'warning',
      archived: 'error'
    };
    return colors[status] || 'default';
  };

  const formatCurrency = (amount, currency = 'INR') => {
    const symbols = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£'
    };
    return `${symbols[currency] || currency}${amount}`;
  };

  const getBillingCycleLabel = (cycle) => {
    const labels = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
      lifetime: 'Lifetime'
    };
    return labels[cycle] || cycle;
  };

  // ============================================================================
  // RENDERING
  // ============================================================================

  if (loading && plans.length === 0) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>
          Loading subscription plans...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', padding: 3 }}>
      {/* ============================================================================ */}
      {/* HEADER SECTION */}
      {/* ============================================================================ */}

      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h4" component="h1" sx={{
          fontWeight: 700,
          color: 'primary.main'
        }}>
          <MonetizationIcon sx={{ mr: 2, fontSize: '2rem' }} />
          Subscription Plan Management
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchPlans(true)}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            Create Plan
          </Button>
        </Box>
      </Box>

      {/* ============================================================================ */}
      {/* ANALYTICS CARDS */}
      {/* ============================================================================ */}

      {analytics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <BookIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4">{analytics.plans?.length || 0}</Typography>
                <Typography variant="body2">Total Plans</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <PeopleIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4">{analytics.subscriptions?.activeSubscriptions || 0}</Typography>
                <Typography variant="body2">Active Subscribers</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <MonetizationIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4">
                  {analytics.subscriptions?.averageRevenuePerUser ?
                    `₹${analytics.subscriptions.averageRevenuePerUser.toFixed(0)}` : '₹0'}
                </Typography>
                <Typography variant="body2">Avg Revenue/User</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: analytics.subscriptions?.churnRate > 10 ? 'error.light' : 'info.light',
                       color: 'info.contrastText' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4">
                  {analytics.subscriptions?.churnRate?.toFixed(1) || 0}%
                </Typography>
                <Typography variant="body2">Churn Rate</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ============================================================================ */}
      {/* FILTERS AND SEARCH */}
      {/* ============================================================================ */}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search plans by name or description..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(filters.search);
                }
              }}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="published">Published</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Skill Level</InputLabel>
              <Select
                value={filters.skillLevel}
                label="Skill Level"
                onChange={(e) => handleFilterChange('skillLevel', e.target.value)}
              >
                <MenuItem value="">All Levels</MenuItem>
                <MenuItem value="Beginner">Beginner</MenuItem>
                <MenuItem value="Intermediate">Intermediate</MenuItem>
                <MenuItem value="Advanced">Advanced</MenuItem>
                <MenuItem value="Expert">Expert</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Min Price"
              type="number"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Max Price"
              type="number"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* ============================================================================ */}
      {/* PLANS TABLE */}
      {/* ============================================================================ */}

      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><Typography fontWeight={600}>Plan Details</Typography></TableCell>
              <TableCell align="center"><Typography fontWeight={600}>Pricing</Typography></TableCell>
              <TableCell align="center"><Typography fontWeight={600}>Courses</Typography></TableCell>
              <TableCell align="center"><Typography fontWeight={600}>Subscribers</Typography></TableCell>
              <TableCell align="center"><Typography fontWeight={600}>Status</Typography></TableCell>
              <TableCell align="center"><Typography fontWeight={600}>Actions</Typography></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan._id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell>
                  <Box>
                    <Typography variant="body1" fontWeight="medium" sx={{ mb: 0.5 }}>
                      {plan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.3
                    }}>
                      {plan.description}
                    </Typography>
                    {plan.business?.isPopular && (
                      <Chip
                        label="Popular"
                        size="small"
                        color="secondary"
                        sx={{ mt: 1, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </TableCell>

                <TableCell align="center">
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(plan.pricing?.price || 0, plan.pricing?.currency)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getBillingCycleLabel(plan.pricing?.billingCycle)}
                    </Typography>
                  </Box>
                </TableCell>

                <TableCell align="center">
                  <Chip
                    label={`${plan.includedCourses?.length || 0} courses`}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                </TableCell>

                <TableCell align="center">
                  <Chip
                    label={`${plan.analytics?.subscriberCount || 0} users`}
                    size="small"
                    variant="outlined"
                    color="info"
                  />
                </TableCell>

                <TableCell align="center">
                  <Chip
                    label={plan.business?.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={getStatusColor(plan.business?.isActive ? 'published' : 'draft')}
                    variant={plan.business?.isVisible ? 'filled' : 'outlined'}
                  />
                </TableCell>

                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setDialogOpen(true);
                      }}
                      title="Edit Plan"
                      color="primary"
                      disabled={processingId === plan._id}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>

                    <IconButton
                      size="small"
                      onClick={() => setConfirmDelete(plan)}
                      title="Delete Plan"
                      color="error"
                      disabled={processingId === plan._id}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>

                    {processingId === plan._id && (
                      <LinearProgress sx={{ width: 48 }} />
                    )}
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
          rowsPerPage={pageSize}
          onRowsPerPageChange={handlePageSizeChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{
            borderTop: 1,
            borderColor: 'divider'
          }}
        />
      </TableContainer>

      {/* ============================================================================ */}
      {/* CREATE/EDIT PLAN DIALOG */}
      {/* ============================================================================ */}

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedPlan(null);
        }}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}>
          {selectedPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <SubscriptionPlanForm
            plan={selectedPlan}
            courses={courses}
            loading={processingId === 'form-submit'}
            onSubmit={handlePlanSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setSelectedPlan(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ============================================================================ */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ============================================================================ */}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
      >
        <DialogTitle>Confirm Plan Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to archive the subscription plan "{confirmDelete?.name}"?
            This action will hide the plan from public view but preserve all subscription history.
          </Typography>
          {confirmDelete?.analytics?.subscriberCount > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                This plan has {confirmDelete.analytics.subscriberCount} active subscribers.
                Existing subscriptions will remain active but no new subscriptions can be created.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => confirmDelete && handleDeletePlan(confirmDelete._id)}
            disabled={processingId === confirmDelete?._id}
          >
            Archive Plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================================================================ */}
      {/* SUCCESS/ERROR MESSAGES */}
      {/* ============================================================================ */}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ============================================================================ */}
      {/* FAB FOR QUICK ACTIONS */}
      {/* ============================================================================ */}

      <Fab
        color="primary"
        title="Create New Plan"
        onClick={() => setDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

// ============================================================================
// PROP TYPES DEFINITION
// ============================================================================

SubscriptionPlanManager.propTypes = {
  // Component can accept external configuration if needed
  onPlanUpdate: PropTypes.func,
  autoRefreshInterval: PropTypes.number
};

SubscriptionPlanManager.defaultProps = {
  onPlanUpdate: null,
  autoRefreshInterval: 60000 // 1 minute
};

export default SubscriptionPlanManager;