import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Button,
  Alert,
  CircularProgress,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  InputAdornment
} from '@mui/material';
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Category as CategoryIcon,
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { DataGrid, GridToolbarExport } from '@mui/x-data-grid';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const AdminDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);

  useEffect(() => {
    loadData();
  }, [tabValue]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      if (tabValue === 0) {
        const res = await axios.get('/api/admin/users');
        setUsers(res.data);
      } else if (tabValue === 1) {
        const res = await axios.get('/api/admin/subscribers');
        setSubscribers(res.data);
      } else if (tabValue === 2) {
        const res = await axios.get('/api/admin/lectures');
        setLectures(res.data);
      } else if (tabValue === 3) {
        const res = await axios.get('/api/admin/categories');
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const monthlySubsData = subscribers.reduce((acc, sub) => {
    const month = new Date(sub.subscription?.subscribedAt).toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const userStats = [
    { name: 'Total Users', value: users.length, color: '#8884d8' },
    { name: 'Subscribers', value: subscribers.length, color: '#82ca9d' },
    { name: 'Free Users', value: users.length - subscribers.length, color: '#ffc658' },
  ];

  const handleSubscriptionAction = async (userId, action) => {
    try {
      setError('');
      setSuccess('');

      const response = await axios.put(`/api/admin/subscription/${userId}`, { action });

      // Update the users list locally
      setUsers(users.map(user =>
        user._id === userId
          ? { ...user, isSubscribed: action === 'verify', subscription: response.data.user.subscription }
          : user
      ));

      // Update subscribers list if needed
      if (action === 'verify') {
        // Add to subscribers if not already there
        const userExists = subscribers.some(sub => sub._id === userId);
        if (!userExists) {
          const updatedUser = users.find(u => u._id === userId);
          setSubscribers([...subscribers, { ...updatedUser, isSubscribed: true, subscription: response.data.user.subscription }]);
        }
      } else if (action === 'revoke') {
        // Remove from subscribers
        setSubscribers(subscribers.filter(sub => sub._id !== userId));
      }

      setSuccess(`Subscription ${action}ed successfully`);
    } catch (err) {
      console.error('Error updating subscription:', err);
      setError(err.response?.data?.message || 'Failed to update subscription');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 3 }}>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
            Enhanced Admin Dashboard
          </Typography>
          <IconButton onClick={loadData}>
            <RefreshIcon />
          </IconButton>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6">Total Users</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{users.length}</Typography>
                  </Box>
                  <PeopleIcon sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6">Subscribers</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{subscribers.length}</Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6">Lectures</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{lectures.length}</Typography>
                  </Box>
                  <AssignmentIcon sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6">Categories</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{categories.length}</Typography>
                  </Box>
                  <CategoryIcon sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {Object.keys(monthlySubsData).length > 0 && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Monthly Subscribers Trend</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={Object.entries(monthlySubsData).map(([month, count]) => ({ month, count }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>User Distribution</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={userStats} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {userStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        )}

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        <Paper sx={{ width: '100%', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable">
            <Tab icon={<PeopleIcon />} label="Users" sx={{ minWidth: 120 }} />
            <Tab icon={<TrendingUpIcon />} label="Subscribers" sx={{ minWidth: 120 }} />
            <Tab icon={<AssignmentIcon />} label="Lectures" sx={{ minWidth: 120 }} />
            <Tab icon={<CategoryIcon />} label="Categories" sx={{ minWidth: 120 }} />
          </Tabs>
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : (
          <Paper sx={{ p: 3 }}>
            {tabValue === 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>All Users ({users.length})</Typography>
                <Box sx={{ height: 600 }}>
                  <DataGrid
                    rows={users.map((user, index) => ({
                      id: user._id || index,
                      name: user.name,
                      email: user.email,
                      role: user.role,
                      isSubscribed: user.isSubscribed,
                    }))}
                    columns={[
                      {
                        field: 'name',
                        headerName: 'Name',
                        flex: 1,
                        renderCell: (params) => (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar>{params.value?.[0]?.toUpperCase()}</Avatar>
                            {params.value}
                          </Box>
                        )
                      },
                      { field: 'email', headerName: 'Email', flex: 1.5 },
                      {
                        field: 'role',
                        headerName: 'Role',
                        flex: 0.5,
                        renderCell: (params) => (
                          <Chip label={params.value} color={params.value === 'admin' ? 'primary' : 'default'} size="small" />
                        )
                      },
                      {
                        field: 'isSubscribed',
                        headerName: 'Status',
                        flex: 1,
                        renderCell: (params) => (
                          <Chip
                            label={params.value ? 'Subscribed' : 'Free'}
                            color={params.value ? 'success' : 'default'}
                            size="small"
                          />
                        )
                      },
                      {
                        field: 'actions',
                        headerName: 'Actions',
                        flex: 1,
                        renderCell: (params) => (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {!params.row.isSubscribed ? (
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                onClick={() => handleSubscriptionAction(params.row.id, 'verify')}
                              >
                                Subscribe
                              </Button>
                            ) : (
                              <Button
                                variant="contained"
                                color="error"
                                size="small"
                                onClick={() => handleSubscriptionAction(params.row.id, 'revoke')}
                              >
                                Revoke
                              </Button>
                            )}
                          </Box>
                        )
                      }
                    ]}
                    components={{ Toolbar: GridToolbarExport }}
                  />
                </Box>
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>Subscribers ({subscribers.length})</Typography>
                <Box sx={{ height: 600 }}>
                  <DataGrid
                    rows={subscribers.map((user, index) => ({
                      id: user._id || index,
                      name: user.name,
                      email: user.email,
                      subscribedAt: user.subscription?.subscribedAt,
                      expiresAt: user.subscription?.expiresAt,
                      amount: user.subscription?.amount,
                    }))}
                    columns={[
                      {
                        field: 'name',
                        headerName: 'Name',
                        flex: 1,
                        renderCell: (params) => (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar>{params.value?.[0]?.toUpperCase()}</Avatar>
                            {params.value}
                          </Box>
                        )
                      },
                      { field: 'email', headerName: 'Email', flex: 1.5 },
                      {
                        field: 'subscribedAt',
                        headerName: 'Subscribed',
                        flex: 1,
                        renderCell: (params) => formatDate(params.value)
                      },
                      {
                        field: 'expiresAt',
                        headerName: 'Expires',
                        flex: 1,
                        renderCell: (params) => formatDate(params.value)
                      },
                      {
                        field: 'amount',
                        headerName: 'Amount',
                        flex: 0.8,
                        renderCell: (params) => `₹${params.value || 'N/A'}`
                      }
                    ]}
                    components={{ Toolbar: GridToolbarExport }}
                  />
                </Box>
              </Box>
            )}

            {tabValue === 2 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6">Lectures ({lectures.length})</Typography>
                  <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setOpenUploadDialog(true)}>
                    Upload Lecture
                  </Button>
                </Box>
                <Box sx={{ height: 600 }}>
                  <DataGrid
                    rows={lectures.map((lecture, index) => ({
                      id: lecture.fileName,
                      displayName: lecture.displayName,
                      size: lecture.size,
                      createdAt: lecture.createdAt
                    }))}
                    columns={[
                      { field: 'displayName', headerName: 'Name', flex: 2 },
                      { field: 'size', headerName: 'Size', flex: 1, renderCell: (params) => `${Math.round(params.value / 1024)} KB` },
                      { field: 'createdAt', headerName: 'Created', flex: 1, renderCell: (params) => formatDate(params.value) },
                      {
                        field: 'actions',
                        headerName: 'Actions',
                        flex: 0.5,
                        renderCell: () => <IconButton color="error"><DeleteIcon /></IconButton>
                      }
                    ]}
                    components={{ Toolbar: GridToolbarExport }}
                  />
                </Box>
              </Box>
            )}

            {tabValue === 3 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6">Categories ({categories.length})</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCategoryDialog(true)}>
                    Add Category
                  </Button>
                </Box>
                <Box sx={{ height: 600 }}>
                  <DataGrid
                    rows={categories.map((category, index) => ({
                      id: category._id,
                      name: category.name,
                      description: category.description,
                      slug: category.slug,
                      order: category.order
                    }))}
                    columns={[
                      { field: 'name', headerName: 'Name', flex: 1 },
                      { field: 'description', headerName: 'Description', flex: 1.5 },
                      { field: 'slug', headerName: 'Slug', flex: 1 },
                      { field: 'order', headerName: 'Order', flex: 0.5 },
                      {
                        field: 'actions',
                        headerName: 'Actions',
                        flex: 1,
                        renderCell: () => (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton size="small" color="primary"><EditIcon /></IconButton>
                            <IconButton size="small" color="error"><DeleteIcon /></IconButton>
                          </Box>
                        )
                      }
                    ]}
                    components={{ Toolbar: GridToolbarExport }}
                  />
                </Box>
              </Box>
            )}
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default AdminDashboard;
