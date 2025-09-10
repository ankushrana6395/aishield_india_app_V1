import React, { useState, useEffect } from 'react';
import CourseForm from './CourseForm';
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
  InputAdornment,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Publish as PublishIcon,
  VisibilityOff as UnpublishIcon
} from '@mui/icons-material';

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCourses, setTotalCourses] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, [page, rowsPerPage, searchTerm, statusFilter, sortBy, sortOrder]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter,
        search: searchTerm,
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/courses/admin/courses?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch courses');

      const data = await response.json();
      setCourses(data.courses || []);
      setTotalCourses(data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToggle = async (courseId, published) => {
    try {
      const response = await fetch(`/api/courses/admin/courses/${courseId}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ published })
      });

      if (!response.ok) throw new Error('Failed to update publish status');

      await fetchCourses();
    } catch (error) {
      console.error('Error toggling publish status:', error);
      setError('Failed to update course status');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    try {
      const response = await fetch(`/api/courses/admin/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete course');

      await fetchCourses();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting course:', error);
      setError('Failed to delete course');
    }
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      Beginner: '#4CAF50',
      Intermediate: '#FF9800',
      Advanced: '#F44336',
      Expert: '#9C27B0'
    };
    return colors[difficulty] || '#757575';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading courses...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Course Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ minWidth: 140 }}
        >
          Create Course
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
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

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={`${sortBy}_${sortOrder}`}
              label="Sort By"
              onChange={(e) => {
                const [field, order] = e.target.value.split('_');
                setSortBy(field);
                setSortOrder(order);
              }}
            >
              <MenuItem value="createdAt_desc">Newest First</MenuItem>
              <MenuItem value="createdAt_asc">Oldest First</MenuItem>
              <MenuItem value="title_asc">Title A-Z</MenuItem>
              <MenuItem value="title_desc">Title Z-A</MenuItem>
              <MenuItem value="enrollments_desc">Most Popular</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Courses Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Course Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Difficulty</TableCell>
              <TableCell align="center">Students</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course._id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {course.title}
                    </Typography>
                    {course.featured && (
                      <Chip
                        label="Featured"
                        size="small"
                        color="primary"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={course.published ? 'Published' : 'Draft'}
                    size="small"
                    color={course.published ? 'success' : 'default'}
                    variant={course.published ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{ color: getDifficultyColor(course.difficulty) }}
                  >
                    {course.difficulty}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {course.enrollments || 0}
                </TableCell>
                <TableCell>
                  {new Date(course.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => handlePublishToggle(course._id, !course.published)}
                      color={course.published ? 'warning' : 'success'}
                    >
                      {course.published ? <UnpublishIcon /> : <PublishIcon />}
                    </IconButton>

                    <IconButton
                      size="small"
                      onClick={() => {/* Navigate to course view */}}
                      color="info"
                    >
                      <VisibilityIcon />
                    </IconButton>

                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedCourse(course);
                        setOpenDialog(true);
                      }}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>

                    <IconButton
                      size="small"
                      onClick={() => setDeleteConfirm(course)}
                      color="error"
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
          count={totalCourses}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </TableContainer>

      {/* Course Form Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setSelectedCourse(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedCourse ? 'Edit Course' : 'Create New Course'}
        </DialogTitle>
        <DialogContent>
          <CourseForm
            course={selectedCourse}
            onSubmit={async (courseData) => {
              try {
                const response = await fetch(`/api/courses/admin/courses${selectedCourse ? `/${selectedCourse._id}` : ''}`, {
                  method: selectedCourse ? 'PUT' : 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify(courseData)
                });

                if (!response.ok) {
                  let errorMessage;

                  try {
                    const errorData = await response.json();

                    if (response.status === 409 && errorData.error === 'Duplicate course') {
                      errorMessage = `${errorData.message} Please try using a different slug or title.`;
                    } else if (errorData.error === 'Validation failed') {
                      errorMessage = `Validation error: ${errorData.errors.map(err => err.message).join(', ')}`;
                    } else if (errorData.message) {
                      errorMessage = errorData.message;
                    } else {
                      errorMessage = `Error ${response.status}: ${response.statusText}`;
                    }
                  } catch (parseError) {
                    const errorText = await response.text();
                    errorMessage = `Server error: ${errorText || response.statusText}`;
                  }

                  throw new Error(errorMessage);
                }

                const result = await response.json();

                setSuccess(`Course ${selectedCourse ? 'updated' : 'created'} successfully!`);
                setOpenDialog(false);
                setSelectedCourse(null);

                // Refresh the courses list
                await fetchCourses();
              } catch (error) {
                console.error('Error saving course:', error);
                setError(`Failed to ${selectedCourse ? 'update' : 'create'} course: ${error.message}`);
              }
            }}
            onCancel={() => {
              setOpenDialog(false);
              setSelectedCourse(null);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            setSelectedCourse(null);
          }}>
            Cancel
          </Button>
          <Button variant="contained">
            {selectedCourse ? 'Update' : 'Create'} Course
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
            Are you sure you want to delete the course "{deleteConfirm?.title}"?
            This will archive the course, but enrollment data will be preserved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirm && handleDeleteCourse(deleteConfirm._id)}
          >
            Delete Course
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CourseManagement;
