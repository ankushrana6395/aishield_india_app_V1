import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Badge,
  Divider,
  CssBaseline
} from '@mui/material';
import UserSubscriptionManager from './admin/UserSubscriptionManager';
import LectureUploadForm from './admin/LectureUploadForm';
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
  MenuBook as MenuBookIcon,
  Subscriptions as SubscriptionsIcon,
  School as SchoolIcon,
  ArrowForward as ArrowForwardIcon,
  Cancel as CancelIcon,
  Logout as LogoutIcon
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
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
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
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    order: 0
  });
  const [uploadForm, setUploadForm] = useState({
    file: null,
    category: '',
    title: '',
    description: ''
  });
  const [subscriptionManagerState, setSubscriptionManagerState] = useState({
    open: false,
    user: null
  });

  const [lectureUploadFormState, setLectureUploadFormState] = useState({
    open: false
  });

  // Content filtering states
  const [filteredLectures, setFilteredLectures] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');

  const drawerWidth = 240;

  useEffect(() => {
    if (activePage) {
      loadDataForPage(activePage);
    }
  }, [activePage]);

  const loadDataForPage = async (page) => {
    setLoading(true);
    setError('');

    try {
      switch (page) {
        case 'dashboard':
          await Promise.all([
            axios.get('/api/admin/users').then(res => setUsers(res.data)),
            axios.get('/api/admin/subscribers').then(res => setSubscribers(res.data)),
            axios.get('/api/admin/lectures').then(res => setLectures(res.data)),
            axios.get('/api/admin/categories').then(res => {
              const categoriesData = res.data?.categories || res.data || [];
              setCategories(Array.isArray(categoriesData) ? categoriesData : []);
            })
          ]);
          break;
        case 'users':
          const usersRes = await axios.get('/api/admin/users');
          setUsers(usersRes.data);
          break;
        case 'courses':
          await fetchCourses();
          break;
        case 'subscriptions':
          const subsRes = await axios.get('/api/admin/subscribers');
          setSubscribers(subsRes.data);
          break;
        case 'content':
          console.log('📋 Loading content page data...');

          try {
            // Always try to load detailed lectures with course info first
            console.log('🔄 Attempting to fetch detailed lectures...');
            const detailedLectures = await fetchDetailedLectures();
            console.log('📊 API returned:', detailedLectures?.length || 0, 'detailed lectures');

            if (detailedLectures && detailedLectures.length > 0) {
              setLectures(detailedLectures);
              console.log('✅ SUCCESS: Using detailed lectures with course relationships');
            } else {
              // Fallback to basic lectures
              console.log('⚠️ WARNING: No detailed lectures found, falling back to basic lectures');
              const contentRes = await axios.get('/api/admin/lectures');
              setLectures(contentRes.data);
              console.log('📋 Fallback API returned:', contentRes.data?.length || 0, 'basic lectures');
            }

            // Always load courses and categories for filtering
            if (courses.length === 0) {
              await fetchCourses();
              console.log('📋 Loaded courses:', courses.length);
            }

            if (categories.length === 0) {
              const catRes = await axios.get('/api/admin/categories');
              const categoriesData = catRes.data?.categories || catRes.data || [];
              setCategories(Array.isArray(categoriesData) ? categoriesData : []);
              console.log('📋 Loaded categories:', categories.length);
            }

          } catch (error) {
            console.error('❌ ERROR: Failed to load detailed content data:', error.response?.data || error.message);
            console.log('🔄 FALLBACK: Trying basic lectures endpoint...');
            try {
              const contentRes = await axios.get('/api/admin/lectures');
              setLectures(contentRes.data);
              console.log('📋 FALLBACK SUCCESS: Loaded basic lectures:', contentRes.data?.length || 0);
            } catch (fallbackError) {
              console.error('❌ CRITICAL ERROR: Both detailed and basic APIs failed:', fallbackError.message);
              setLectures([]);
            }
          }
          break;
        case 'categories':
          const catRes = await axios.get('/api/admin/categories');
          const categoriesData = catRes.data?.categories || catRes.data || [];
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
          break;
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUpIcon },
    { id: 'courses', label: 'Courses', icon: MenuBookIcon },
    { id: 'content', label: 'Content', icon: AssignmentIcon },
    { id: 'users', label: 'Users', icon: PeopleIcon },
    { id: 'subscriptions', label: 'Subscriptions', icon: SubscriptionsIcon },
    { id: 'categories', label: 'Categories', icon: CategoryIcon }
  ];

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/courses/admin/courses?limit=100');
      const coursesData = response.data.courses || [];
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
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

  const renderMainContent = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, color: '#1a202c', fontWeight: 600 }}>
              Dashboard Overview
            </Typography>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="overline" sx={{ color: '#718096', fontSize: '0.75rem', fontWeight: 600 }}>
                      TOTAL USERS
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#1a202c', fontWeight: 600, mt: 1 }}>
                      {users.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="overline" sx={{ color: '#718096', fontSize: '0.75rem', fontWeight: 600 }}>
                      ACTIVE SUBSCRIBERS
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#1a202c', fontWeight: 600, mt: 1 }}>
                      {subscribers.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="overline" sx={{ color: '#718096', fontSize: '0.75rem', fontWeight: 600 }}>
                      TOTAL CONTENT
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#1a202c', fontWeight: 600, mt: 1 }}>
                      {lectures.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="overline" sx={{ color: '#718096', fontSize: '0.75rem', fontWeight: 600 }}>
                      CATEGORIES
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#1a202c', fontWeight: 600, mt: 1 }}>
                      {categories.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {Object.keys(monthlySubsData).length > 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3, border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#1a202c', fontWeight: 600 }}>
                      Subscription Trend
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={Object.entries(monthlySubsData).map(([month, count]) => ({ month, count }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#3182ce" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3, border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#1a202c', fontWeight: 600 }}>
                      User Distribution
                    </Typography>
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
          </Box>
        );

      case 'users':
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, color: '#1a202c', fontWeight: 600 }}>
              User Management
            </Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ height: 600 }}>
                <DataGrid
                  rows={Array.isArray(users) ? users.map((user, index) => ({
                    id: user._id || `user_${index}`,
                    name: user.name || 'N/A',
                    email: user.email || 'N/A',
                    role: user.role || 'user',
                    isSubscribed: user.isSubscribed || false,
                  })) : []}
                  columns={[
                    {
                      field: 'name',
                      headerName: 'Name',
                      flex: 1,
                      renderCell: (params) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar>{params.value?.[0]?.toUpperCase() || 'U'}</Avatar>
                          <Typography variant="body2">{params.value}</Typography>
                        </Box>
                      )
                    },
                    { field: 'email', headerName: 'Email', flex: 1.5 },
                    {
                      field: 'role',
                      headerName: 'Role',
                      flex: 0.5,
                      renderCell: (params) => (
                        <Chip label={params.value || 'user'} color={params.value === 'admin' ? 'primary' : 'default'} size="small" />
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
                      flex: 1.2,
                      renderCell: (params) => (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            onClick={() => {
                              const user = users.find(u => u._id === params.row.id);
                              if (user) {
                                setSubscriptionManagerState({
                                  open: true,
                                  user: user
                                });
                              }
                            }}
                          >
                            {params.row.isSubscribed ? 'Manage' : 'Grant Access'}
                          </Button>
                          {params.row.isSubscribed && (
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
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
                  pageSize={10}
                  rowsPerPageOptions={[5, 10, 25]}
                />
              </Box>
            )}
          </Box>
        );

      case 'content':
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ color: '#1a202c', fontWeight: 600 }}>
                Content Management
              </Typography>
              <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={handleOpenUploadDialog}>
                Upload Content
              </Button>
            </Box>

            {/* Filters Section */}
            <Paper sx={{ p: 3, mb: 3, border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#1a202c', fontWeight: 600 }}>
                  Filter Lectures
                </Typography>
                <Chip
                  label="Enhanced API"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: '20px' }}
                />
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Filter by Category</InputLabel>
                    <Select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      label="Filter by Category"
                      startAdornment={
                        <InputAdornment position="start">
                          <CategoryIcon />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="">
                        <em>All Categories</em>
                      </MenuItem>
                      {Array.isArray(categories) && categories.map((category) => {
                        const lectureCount = lectures.filter(l => l.categoryId === category._id || l.category === category.name).length;
                        return (
                          <MenuItem key={category._id} value={category._id}>
                            {category.name} ({lectureCount} lectures)
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Filter by Course</InputLabel>
                    <Select
                      value={selectedCourseFilter}
                      onChange={(e) => setSelectedCourseFilter(e.target.value)}
                      label="Filter by Course"
                      startAdornment={
                        <InputAdornment position="start">
                          <SchoolIcon />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="">
                        <em>All Courses</em>
                      </MenuItem>
                      {/* Show courses from the loaded course data */}
                      {Array.isArray(courses) && courses.length > 0 ? (
                        courses.map((course) => (
                          <MenuItem key={course._id} value={course._id}>
                            {course.title} ({course.slug})
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem value="" disabled>
                          <em>Loading courses...</em>
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {filteredLectures.length} of {lectures.length} lectures
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedCategoryFilter('');
                    setSelectedCourseFilter('');
                  }}
                >
                  Clear Filters
                </Button>
              </Box>
            </Paper>

            {/* Content Table */}
            <Box sx={{ height: 600 }}>
                <DataGrid
                  rows={filteredLectures.map((lecture, index) => {
                    // Create a clean, unique row ID by sanitizing special characters
                    const rawId = lecture._id || lecture.fileName || `lecture_${index}`;
                    const cleanId = String(rawId).replace(/[#\?\&\[\]]/g, '_').replace(/^\-+|\-+$/g, '').replace(/_\+/g, '_');

                    // Always include courseId from the original data - don't null it out
                    return {
                      id: cleanId || `lecture_${index}`,
                      title: lecture.displayName || lecture.title || 'Untitled',
                      slug: lecture.displayName || 'No slug',
                      category: lecture.category || 'No Category',
                      categoryId: lecture.categoryId || null,
                      course: lecture.course || 'No Course',
                      courseId: lecture.courseId, // Keep the original courseId - don't set to null
                      size: lecture.size || 0,
                      createdAt: lecture.createdAt || null,
                      lectureType: lecture.lectureType || 'unknown' // For debugging
                    };
                  })}
                columns={[
                  {
                    field: 'title',
                    headerName: 'Lecture Title',
                    flex: 2.5,
                    renderCell: (params) => (
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {params.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {params.row.slug}
                        </Typography>
                      </Box>
                    )
                  },
                  {
                    field: 'category',
                    headerName: 'Category',
                    flex: 1.5,
                    renderCell: (params) => (
                      <Chip
                        label={params.value}
                        size="small"
                        variant="outlined"
                        color="info"
                        icon={<CategoryIcon />}
                      />
                    )
                  },
                  {
                    field: 'course',
                    headerName: 'Course',
                    flex: 2,
                    renderCell: (params) => (
                      <Chip
                        label={params.value}
                        size="small"
                        variant="outlined"
                        color="primary"
                        icon={<SchoolIcon />}
                      />
                    )
                  },
                  {
                    field: 'size',
                    headerName: 'Size',
                    flex: 0.8,
                    renderCell: (params) => {
                      if (!params.value || params.value === 0) return '-';
                      const sizeInKB = Math.round(params.value / 1024);
                      return `${sizeInKB} KB`;
                    }
                  },
                  {
                    field: 'createdAt',
                    headerName: 'Created',
                    flex: 1,
                    renderCell: (params) => formatDate(params.value)
                  },
                  {
                    field: 'actions',
                    headerName: 'Actions',
                    flex: 1.2,
                    renderCell: (params) => (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => {
                            // Use filename for file-based lectures or title for database lectures
                            const filename = params.row.slug || params.row.title;
                            handleDeleteLecture(filename);
                          }}
                        >
                          Delete
                        </Button>
                      </Box>
                    )
                  }
                ]}
                components={{ Toolbar: GridToolbarExport }}
                pageSize={10}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </Box>
          </Box>
        );

      case 'categories':
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h5" sx={{ color: '#1a202c', fontWeight: 600 }}>
                Category Management
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCategoryDialog}>
                Add Category
              </Button>
            </Box>
            <Box sx={{ height: 600 }}>
              <DataGrid
                rows={Array.isArray(categories) ? categories.map((category, index) => ({
                  id: category._id,
                  name: category.name,
                  description: category.description,
                  slug: category.slug,
                  order: category.order
                })) : []}
                columns={[
                  { field: 'name', headerName: 'Name', flex: 1 },
                  { field: 'description', headerName: 'Description', flex: 1.5 },
                  { field: 'slug', headerName: 'Slug', flex: 1 },
                  { field: 'order', headerName: 'Order', flex: 0.5 }
                ]}
                components={{ Toolbar: GridToolbarExport }}
              />
            </Box>
          </Box>
        );

      case 'subscriptions':
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, color: '#1a202c', fontWeight: 600 }}>
              Subscription Management
            </Typography>
            <Box sx={{ height: 600 }}>
              <DataGrid
                rows={subscribers.map((user, index) => ({
                  id: user._id || index,
                  name: user.name,
                  email: user.email,
                  plan: user.subscription?.planName || 'N/A',
                  amount: user.subscription?.price || 0,
                  status: user.subscription?.status || 'unknown'
                }))}
                columns={[
                  {
                    field: 'name',
                    headerName: 'Subscriber',
                    flex: 1.4,
                    renderCell: (params) => (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {params.value?.[0]?.toUpperCase() || 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {params.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {params.row.email || 'No email'}
                          </Typography>
                        </Box>
                      </Box>
                    )
                  },
                  {
                    field: 'plan',
                    headerName: 'Plan',
                    flex: 1,
                    renderCell: (params) => (
                      <Chip
                        label={params.value || 'Free'}
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                    )
                  },
                  {
                    field: 'billingCycle',
                    headerName: 'Billing Cycle',
                    flex: 0.8,
                    renderCell: (params) => (
                      <Chip
                        label={params.value || 'N/A'}
                        variant="outlined"
                        color="info"
                        size="small"
                      />
                    )
                  },
                  {
                    field: 'amount',
                    headerName: 'Revenue',
                    flex: 0.8,
                    renderCell: (params) => (
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        ₹{params.value || 0}
                      </Typography>
                    )
                  },
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
                    field: 'status',
                    headerName: 'Status',
                    flex: 0.8,
                    renderCell: (params) => (
                      <Chip
                        label={(params.value || 'unknown').toUpperCase()}
                        color={params.value === 'completed' ? 'success' : params.value === 'active' ? 'primary' : 'warning'}
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
                        <Button
                          variant="outlined"
                          size="small"
                          color="primary"
                          onClick={() => {
                            const user = subscribers.find(u => u._id === params.row.id);
                            if (user) {
                              setSubscriptionManagerState({
                                open: true,
                                user: user
                              });
                            }
                          }}
                        >
                          Manage
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={() => handleSubscriptionAction(params.row.id, 'revoke')}
                        >
                          Revoke
                        </Button>
                      </Box>
                    )
                  }
                ]}
                components={{ Toolbar: GridToolbarExport }}
              />
            </Box>
          </Box>
        );

      case 'courses':
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, color: '#1a202c', fontWeight: 600 }}>
              Course Management
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Course management features are available through the dedicated course management page.
            </Alert>
            <Box sx={{ textAlign: 'center' }}>
              <Button variant="contained" size="large" onClick={() => navigate('/admin/courses')}>
                Open Course Management
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  const handleSubscriptionAction = async (userId, action) => {
    try {
      setError('');
      setSuccess('');

      const response = await axios.put(`/api/admin/subscription/${userId}`, { action });

      setUsers(users.map(user =>
        user._id === userId
          ? { ...user, isSubscribed: action === 'verify', subscription: response.data.user.subscription }
          : user
      ));

      if (action === 'verify') {
        const userExists = subscribers.some(sub => sub._id === userId);
        if (!userExists) {
          const updatedUser = users.find(u => u._id === userId);
          setSubscribers([...subscribers, { ...updatedUser, isSubscribed: true, subscription: response.data.user.subscription }]);
        }
      } else if (action === 'revoke') {
        setSubscribers(subscribers.filter(sub => sub._id !== userId));
      }

      setSuccess(`${action.charAt(0).toUpperCase() + action.slice(1)} subscription successfully`);
    } catch (err) {
      console.error('Error updating subscription:', err);
      setError(err.response?.data?.message || 'Failed to update subscription');
    }
  };

  const handleCategoryFormChange = (event) => {
    const { name, value } = event.target;
    setCategoryForm(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      setCategoryForm(prev => ({
        ...prev,
        slug: slug
      }));
    }
  };

  const handleCategorySubmit = async () => {
    try {
      setError('');
      setSuccess('');

      if (!categoryForm.name || !categoryForm.slug) {
        setError('Category name and slug are required');
        return;
      }

      const response = await axios.post('/api/admin/categories', categoryForm);

      setCategories([...categories, response.data.category]);

      setCategoryForm({
        name: '',
        slug: '',
        description: '',
        order: 0
      });
      setOpenCategoryDialog(false);

      setSuccess('Category created successfully');
    } catch (err) {
      console.error('Error creating category:', err);
      setError(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleOpenCategoryDialog = () => {
    setCurrentCategory(null);
    setCategoryForm({
      name: '',
      slug: '',
      description: '',
      order: 0
    });
    setOpenCategoryDialog(true);
  };

  const handleUploadFormChange = (event) => {
    const { name, value } = event.target;
    setUploadForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (event) => {
    setUploadForm(prev => ({
      ...prev,
      file: event.target.files[0]
    }));
  };

  const handleUploadSubmit = async () => {
    try {
      setError('');
      setSuccess('');

      if (!uploadForm.file) {
        setError('Please select a file to upload');
        return;
      }
      if (!uploadForm.category) {
        setError('Please select a category');
        return;
      }

      const formData = new FormData();
      formData.append('lecture', uploadForm.file);
      formData.append('category', uploadForm.category);
      if (uploadForm.title) {
        formData.append('title', uploadForm.title);
      }
      if (uploadForm.description) {
        formData.append('description', uploadForm.description);
      }

      const response = await axios.post('/api/admin/upload-lecture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const lecturesResponse = await axios.get('/api/admin/lectures');
      setLectures(lecturesResponse.data);

      setUploadForm({
        file: null,
        category: '',
        title: '',
        description: ''
      });
      setOpenUploadDialog(false);

      setSuccess('Lecture uploaded successfully');
    } catch (err) {
      console.error('Error uploading lecture:', err);
      setError(err.response?.data?.message || 'Failed to upload lecture');
    }
  };

  const handleOpenUploadDialog = () => {
    setLectureUploadFormState({ open: true });
  };

  const handleLectureUploaded = (results) => {
    setSuccess(`${results.length} lecture(s) uploaded successfully`);
    loadDataForPage(activePage);
  };

  // Filter lectures based on selected filters
  useEffect(() => {
    if (lectures.length > 0 || activePage === 'content') {
      filterLectures();
    }
  }, [lectures, selectedCategoryFilter, selectedCourseFilter]);

  const filterLectures = () => {
    let filtered = [...lectures];
    console.log('🎯 Starting filter with', filtered.length, 'lectures');

    // Apply category filter
    if (selectedCategoryFilter) {
      console.log('📂 Applying category filter:', selectedCategoryFilter);
      filtered = filtered.filter(lecture => {
        const match = lecture.categoryId === selectedCategoryFilter;
        console.log(`   Checking lecture ${lecture.title}: categoryId=${lecture.categoryId}, match=${match}`);
        return match;
      });
      console.log('📂 After category filter:', filtered.length, 'lectures remaining');
    }

    // Apply course filter - check if lecture has the courseId we're looking for
    if (selectedCourseFilter) {
      console.log('🎓 Applying course filter:', selectedCourseFilter);
      filtered = filtered.filter(lecture => {
        // Direct comparison of courseId field from API response
        const lectureCourseId = lecture.courseId;
        const courseMatch = lectureCourseId === selectedCourseFilter;
        const titleMatch = lecture.title && lecture.title.includes('course');

        // Debug: Show the actual values for troubleshooting
        if (lecture.title) {
          console.log(`   💡 "${lecture.title}": courseId="${lectureCourseId}", expecting="${selectedCourseFilter}", match=${courseMatch}`);
        }

        return courseMatch;
      });
      console.log('🎓 After course filter:', filtered.length, 'lectures remaining');

      // Show details of remaining lectures after filtering
      if (filtered.length > 0) {
        console.log('🎯 REMAINING LECTURES AFTER COURSE FILTER:');
        filtered.forEach((lecture, index) => {
          console.log(`   ${index + 1}. "${lecture.title}" - courseId: "${lecture.courseId}"`);
        });
      }
    }

    console.log('✅ Final filtered lectures count:', filtered.length);
    setFilteredLectures(filtered);
  };

  // Fetch detailed lecture data with relationships
  const fetchDetailedLectures = async () => {
    try {
      console.log('🔄 Fetching detailed lectures...');
      const response = await axios.get('/api/admin/lectures/detailed');
      const lectures = response.data || [];
      console.log('📊 Received', lectures.length, 'detailed lectures');

      // Log sample of lecture data to verify course info
      if (lectures.length > 0) {
        console.log('🔍 Sample lecture data:');
        console.log('   Title:', lectures[0].title);
        console.log('   Course:', lectures[0].course);
        console.log('   CourseID:', lectures[0].courseId);
        console.log('   Category:', lectures[0].category);
        console.log('   CategoryID:', lectures[0].categoryId);

        // Check how many have course info
        const withCourses = lectures.filter(l => l.courseId).length;
        console.log('📈 Lectures with course IDs:', withCourses, 'of', lectures.length);

        // Check if the course we're trying to filter exists
        const ourCourseId = '68be8f820793ae38ae3e0927';
        const matchingLectures = lectures.filter(l => l.courseId === ourCourseId);
        console.log('🎯 Lectures matching course ID', ourCourseId + ':', matchingLectures.length);
      }

      return lectures;
    } catch (error) {
      console.error('Error fetching detailed lectures:', error);
      // Fallback to basic lecture data
      const basicResponse = await axios.get('/api/admin/lectures');
      return basicResponse.data || [];
    }
  };

  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Navigate to login page
    navigate('/login');
  };

  const handleDeleteLecture = async (lectureFileName) => {
    try {
      setError('');
      setSuccess('');

      if (!window.confirm(`Are you sure you want to delete the lecture "${lectureFileName}"?`)) {
        return;
      }

      const response = await axios.delete(`/api/admin/lectures/${encodeURIComponent(lectureFileName)}`);

      setLectures(lectures.filter(lecture => lecture.fileName !== lectureFileName));

      setSuccess('Lecture deleted successfully');
    } catch (err) {
      console.error('Error deleting lecture:', err);
      setError(err.response?.data?.message || 'Failed to delete lecture');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />

      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          bgcolor: '#ffffff',
          color: '#1a202c',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid #e2e8f0'
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
            AIShield India Admin
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: '#718096' }}>
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>
            <IconButton
              onClick={() => loadDataForPage(activePage)}
              sx={{ color: '#4a5568' }}
              title="Refresh Data"
            >
              <RefreshIcon />
            </IconButton>
            <IconButton
              onClick={handleLogout}
              sx={{ color: '#4a5568', '&:hover': { color: '#e53e3e', bgcolor: '#fed7d7' } }}
              title="Logout"
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#f7fafc',
            borderRight: '1px solid #e2e8f0'
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <Typography
            variant="h6"
            sx={{
              px: 3,
              py: 2,
              color: '#1a202c',
              fontWeight: 600,
              fontSize: '1.1rem'
            }}
          >
            Administration
          </Typography>

          <List>
            {navigationItems.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  selected={activePage === item.id}
                  onClick={() => setActivePage(item.id)}
                  sx={{
                    mx: 2,
                    my: 0.5,
                    borderRadius: 2,
                    '&.Mui-selected': {
                      bgcolor: '#3182ce',
                      color: 'white',
                      '&:hover': {
                        bgcolor: '#2c5282'
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'white'
                      }
                    },
                    '&:hover': {
                      bgcolor: activePage === item.id ? '#2c5282' : '#edf2f7'
                    }
                  }}
                >
                  <ListItemIcon>
                    <item.icon sx={{ color: activePage === item.id ? 'white' : '#718096' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: activePage === item.id ? 600 : 500,
                      fontSize: '0.9rem'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2, mx: 2 }} />

          {/* Quick Actions Section */}
          <Typography
            variant="subtitle2"
            sx={{
              px: 3,
              py: 1,
              color: '#4a5568',
              fontWeight: 600,
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: 1
            }}
          >
            Quick Actions
          </Typography>

          <List>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => navigate('/admin/courses')}
                sx={{
                  mx: 2,
                  my: 0.5,
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: '#edf2f7'
                  }
                }}
              >
                <ListItemIcon>
                  <AddIcon sx={{ color: '#38a169' }} />
                </ListItemIcon>
                <ListItemText
                  primary="New Course"
                  primaryTypographyProps={{
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}
                />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                onClick={() => navigate('/admin/subscription-plans')}
                sx={{
                  mx: 2,
                  my: 0.5,
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: '#edf2f7'
                  }
                }}
              >
                <ListItemIcon>
                  <AddIcon sx={{ color: '#38a169' }} />
                </ListItemIcon>
                <ListItemText
                  primary="New Plan"
                  primaryTypographyProps={{
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}
                />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                onClick={handleOpenUploadDialog}
                sx={{
                  mx: 2,
                  my: 0.5,
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: '#edf2f7'
                  }
                }}
              >
                <ListItemIcon>
                  <CloudUploadIcon sx={{ color: '#3182ce' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Upload Content"
                  primaryTypographyProps={{
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}
                />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                onClick={handleOpenCategoryDialog}
                sx={{
                  mx: 2,
                  my: 0.5,
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: '#edf2f7'
                  }
                }}
              >
                <ListItemIcon>
                  <CategoryIcon sx={{ color: '#dd6b20' }} />
                </ListItemIcon>
                <ListItemText
                  primary="New Category"
                  primaryTypographyProps={{
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: '#f8f9fa',
          p: 3,
          width: `calc(100% - ${drawerWidth}px)`
        }}
      >
        <Toolbar />

        {/* Error/Success Messages */}
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        {/* Main Content */}
        <Container maxWidth="xl" sx={{ pb: 4 }}>
          {renderMainContent()}
        </Container>
      </Box>

      {/* Upload Dialog */}
      <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Lecture</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={<UploadIcon />}
                  sx={{ py: 3 }}
                >
                  {uploadForm.file ? uploadForm.file.name : 'Select Lecture File'}
                  <input
                    type="file"
                    hidden
                    accept=".html"
                    onChange={handleFileChange}
                  />
                </Button>
                {uploadForm.file && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Selected: {uploadForm.file.name} ({Math.round(uploadForm.file.size / 1024)} KB)
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Category *</InputLabel>
                  <Select
                    name="category"
                    value={uploadForm.category}
                    onChange={handleUploadFormChange}
                    label="Category *"
                    startAdornment={
                      <InputAdornment position="start">
                        <CategoryIcon />
                      </InputAdornment>
                    }
                  >
                    {Array.isArray(categories) ? categories.map((category) => (
                      <MenuItem key={category._id} value={category._id}>
                        {category.name}
                      </MenuItem>
                    )) : null}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title (Optional)"
                  name="title"
                  value={uploadForm.title}
                  onChange={handleUploadFormChange}
                  helperText="Leave empty to auto-generate from filename"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AssignmentIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description (Optional)"
                  name="description"
                  value={uploadForm.description}
                  onChange={handleUploadFormChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AssignmentIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUploadDialog(false)}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleUploadSubmit}>
            Upload Lecture
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={openCategoryDialog} onClose={() => setOpenCategoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentCategory ? 'Edit Category' : 'Create New Category'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Category Name"
                  name="name"
                  value={categoryForm.name}
                  onChange={handleCategoryFormChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CategoryIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Slug"
                  name="slug"
                  value={categoryForm.slug}
                  onChange={handleCategoryFormChange}
                  helperText="URL-friendly name (auto-generated from category name)"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        #
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  name="description"
                  value={categoryForm.description}
                  onChange={handleCategoryFormChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AssignmentIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Order"
                  name="order"
                  value={categoryForm.order}
                  onChange={handleCategoryFormChange}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCategoryDialog(false)}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleCategorySubmit}>
            {currentCategory ? 'Update Category' : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Subscription Manager */}
      <UserSubscriptionManager
        user={subscriptionManagerState.user}
        open={subscriptionManagerState.open}
        onClose={() => setSubscriptionManagerState({ open: false, user: null })}
        onSubscriptionGranted={(user, subscription) => {
          setSuccess(`Subscription granted to ${user.name}`);
          loadDataForPage(activePage);
          setSubscriptionManagerState({ open: false, user: null });
        }}
        onSubscriptionRevoked={(user) => {
          setSuccess(`Subscription revoked for ${user.name}`);
          loadDataForPage(activePage);
          setSubscriptionManagerState({ open: false, user: null });
        }}
      />

      {/* Enhanced Lecture Upload Form */}
      <LectureUploadForm
        open={lectureUploadFormState.open}
        onClose={() => setLectureUploadFormState({ open: false })}
        onLectureUploaded={handleLectureUploaded}
      />
    </Box>
  );
};

export default AdminDashboard;
