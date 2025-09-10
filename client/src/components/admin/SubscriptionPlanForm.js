import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Chip,
  Card,
  CardContent,
  FormControlLabel,
  RadioGroup,
  Radio,
  Divider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  MonetizationOn as PriceIcon,
  Book as CourseIcon,
  ExpandMore as ExpandMoreIcon,
  Business as BusinessIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import PropTypes from 'prop-types';

/**
 * Enterprise Subscription Plan Form Component
 *
 * Professional form component for creating and editing subscription plans
 * with comprehensive validation, conditional rendering, and user-friendly UX
 */
const SubscriptionPlanForm = ({
  plan,
  courses = [],
  loading = false,
  onSubmit,
  onCancel,
  createdBy
}) => {
  // ============================================================================
  // FORM STATE MANAGEMENT
  // ============================================================================

  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    slug: '',
    description: '',
    shortDescription: '',

    // Pricing Configuration
    pricing: {
      currency: 'INR',
      price: '',
      originalPrice: '',
      discountPercentage: 0,
      billingCycle: 'monthly',
      trialPeriod: 0,
      setupFee: 0
    },

    // Business Rules
    business: {
      isActive: true,
      isVisible: true,
      isPopular: false,
      isRecommended: false,
      targetAudience: [],
      targetOccupations: [],
      skillLevels: [],
      industries: [],
      sortOrder: 0,
      maxSubscriptions: '',
      maxEnrollments: ''
    },

    // Feature Configuration
    features: {
      unlimitedLectures: true,
      downloadableContent: false,
      offlineAccess: false,
      certificates: true,
      progressTracking: true,
      customLearningPaths: false,
      practiceExercises: false,
      quizzesAssessments: true,
      prioritySupport: false,
      mentoringSessions: 0,
      liveWebinars: 0,
      communityAccess: true,
      mobileAccess: true,
      desktopAccess: true
    },

    // Course Selection
    includedCourses: [],

    // Marketing
    marketing: {
      badgeText: '',
      badgeColor: '#1976d2',
      callToAction: 'Subscribe Now',
      highlightColor: '#1976d2',
      benefits: []
    }
  });

  const [selectedCourses, setSelectedCourses] = useState({});
  const [expandedSection, setExpandedSection] = useState('basic');
  const [validationErrors, setValidationErrors] = useState({});
  const [benefitInput, setBenefitInput] = useState('');

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    console.log('🔍 FORM DEBUG: useEffect triggered, plan:', !!plan);
    console.log('🔍 FORM DEBUG: courses:', !!courses, 'count:', courses?.length || 0);

    // Only proceed if both plan and courses are loaded
    if (!plan || !courses || courses.length === 0) {
      console.log('⏳ FORM DEBUG: Waiting for data - plan:', !!plan, 'courses:', !!courses, 'course count:', courses?.length || 0);
      return;
    }

    console.log('🔍 FORM DEBUG: Available courses (first 5):',
      courses.slice(0, 5).map(c => ({ id: c._id, name: c.title })));

    console.log('🔍 FORM DEBUG: Processing plan for form');
    // Load existing plan data for editing
      console.log('🔍 FORM DEBUG: Loading existing plan data:', {
        name: plan.name,
        includedCoursesCount: plan.includedCourses?.length || 0,
        includedCoursesPreview: (plan.includedCourses || []).slice(0, 3).map(c => ({
          courseId: c.courseId,
          courseName: c.courseName
        }))
      });

      const loadedData = {
        // Basic Information
        name: plan.name || '',
        slug: plan.slug || '',
        description: plan.description || '',
        shortDescription: plan.shortDescription || '',

        // Pricing Configuration
        pricing: {
          currency: plan.pricing?.currency || 'INR',
          price: plan.pricing?.price || '',
          originalPrice: plan.pricing?.originalPrice || '',
          discountPercentage: plan.pricing?.discountPercentage || 0,
          billingCycle: plan.pricing?.billingCycle || 'monthly',
          trialPeriod: plan.pricing?.trialPeriod || 0,
          setupFee: plan.pricing?.setupFee || 0
        },

        // Business Rules
        business: {
          isActive: plan.business?.isActive !== false,
          isVisible: plan.business?.isVisible !== false,
          isPopular: plan.business?.isPopular || false,
          isRecommended: plan.business?.isRecommended || false,
          targetAudience: plan.business?.targetAudience || [],
          targetOccupations: plan.business?.targetOccupations || [],
          skillLevels: plan.business?.skillLevels || [],
          industries: plan.business?.industries || [],
          sortOrder: plan.business?.sortOrder || 0,
          maxSubscriptions: plan.business?.maxSubscriptions || '',
          maxEnrollments: plan.business?.maxEnrollments || ''
        },

        // Features
        features: {
          ...formData.features,
          ...(plan.features || {})
        },

        // Course Selection
        includedCourses: (plan.includedCourses || []).map(course => ({
          courseId: course.courseId,
          courseName: course.courseName,
          courseSlug: course.courseSlug,
          accessLevel: course.accessLevel,
          restrictions: course.restrictions || {}
        })),

        // Marketing
        marketing: {
          ...formData.marketing,
          ...(plan.marketing || {})
        }
      };

      console.log('🔍 FORM DEBUG: Processed form data:', {
        includedCoursesCount: loadedData.includedCourses.length,
        includedCourses: loadedData.includedCourses.map(c => ({
          courseId: c.courseId,
          courseName: c.courseName
        }))
      });

      setFormData(loadedData);

      // Pre-select courses - with better ID handling and missing course detection
      const selected = {};
      console.log('🔍 FORM DEBUG: Setting up selected courses...');

      loadedData.includedCourses.forEach(course => {
        console.log('🔍 FORM DEBUG: Processing course for selection:', {
          courseId: course.courseId,
          courseName: course.courseName,
          courseSlug: course.courseSlug
        });

        // Ensure courseId is a string
        const courseIdStr = typeof course.courseId === 'string' ? course.courseId : course.courseId?._id?.toString() || course.courseId?.toString();

        // Check if this course exists in available courses list (with multiple ID formats)
        let found = courses?.find(c => c._id === courseIdStr || c._id?.toString() === courseIdStr);

        if (!found) {
          console.log('⚠️ FORM DEBUG: Course not found in available courses list:', courseIdStr, 'Available IDs:', courses?.map(c => c._id.toString()).slice(0, 5));

          // Create a placeholder for missing courses
          selected[courseIdStr] = {
            courseId: courseIdStr,
            courseName: course.courseName || 'Course Not Available',
            courseSlug: course.courseSlug || 'unknown-course',
            accessLevel: course.accessLevel || 'full',
            restrictions: course.restrictions || {},
            isMissing: true // Flag for UI to show this is missing
          };
        } else {
          console.log('✅ FORM DEBUG: Course found in available list:', found.title);

          // Use the actual course data from the available courses list
          selected[courseIdStr] = {
            ...course,
            courseId: courseIdStr, // Ensure we're using string ID
            courseName: found.title || course.courseName,
            courseSlug: found.slug || course.courseSlug,
            accessLevel: course.accessLevel || 'full',
            restrictions: course.restrictions || {}
          };
        }
      });

      console.log('🔍 FORM DEBUG: Final selected courses count:', Object.keys(selected).length, 'with', Object.values(selected).filter(s => s.isMissing).length, 'missing courses');
      setSelectedCourses(selected);
  }, [plan, courses]);

  // Separate useEffect for new plan initialization
  useEffect(() => {
    if (!plan && !courses) {
      console.log('🔍 FORM DEBUG: New plan - setting default expanded section');
      setExpandedSection('basic');
    }
  }, []);

  // ============================================================================
  // VALUE UPDATE HANDLERS
  // ============================================================================

  /**
   * Update basic form field
   */
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-generate slug from name
    if (field === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({
        ...prev,
        slug: slug
      }));
    }
  };

  /**
   * Update pricing configuration
   */
  const handlePricingChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [field]: value
      }
    }));

    // Auto-calculate discount percentage
    if (field === 'originalPrice' && value && formData.pricing.price) {
      const price = parseFloat(formData.pricing.price);
      const originalPrice = parseFloat(value);
      if (originalPrice > price) {
        const discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
        setFormData(prev => ({
          ...prev,
          pricing: {
            ...prev.pricing,
            discountPercentage
          }
        }));
      }
    }
  };

  /**
   * Update business configuration
   */
  const handleBusinessChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      business: {
        ...prev.business,
        [field]: value
      }
    }));
  };

  /**
   * Update feature toggle
   */
  const handleFeatureToggle = (featureName, value) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [featureName]: value
      }
    }));
  };

  /**
   * Update marketing field
   */
  const handleMarketingChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      marketing: {
        ...prev.marketing,
        [field]: value
      }
    }));
  };

  // ============================================================================
  // COURSE MANAGEMENT
  // ============================================================================

  /**
   * Toggle course selection
   */
  const handleCourseToggle = (courseId) => {
    console.log('🔍 COURSE DEBUG: Toggling course selection for:', courseId);

    const course = courses.find(c => c._id === courseId);
    console.log('🔍 COURSE DEBUG: Found course:', !!course, course ? { id: course._id, title: course.title } : 'NOT FOUND');

    setSelectedCourses(prev => {
      const newSelected = { ...prev };

      if (newSelected[courseId]) {
        console.log('🔍 COURSE DEBUG: Removing course from selection');
        delete newSelected[courseId];
      } else {
        console.log('🔍 COURSE DEBUG: Adding course to selection');
        // Get course details
        newSelected[courseId] = {
          courseId,
          courseName: course?.title || 'Unknown Course',
          courseSlug: course?.slug || 'unknown-course',
          accessLevel: 'full',
          restrictions: {}
        };
      }

      console.log('🔍 COURSE DEBUG: Updated selected courses count:', Object.keys(newSelected).length);

      // Update form data
      setFormData(prev => ({
        ...prev,
        includedCourses: Object.values(newSelected)
      }));

      return newSelected;
    });
  };

  /**
   * Add custom benefit
   */
  const handleAddBenefit = () => {
    if (benefitInput.trim()) {
      const newBenefit = {
        title: benefitInput.trim(),
        description: benefitInput.trim(),
        _id: Date.now() // Temporary ID for UI
      };

      setFormData(prev => ({
        ...prev,
        marketing: {
          ...prev.marketing,
          benefits: [...prev.marketing.benefits, newBenefit]
        }
      }));

      setBenefitInput('');
    }
  };

  /**
   * Remove benefit
   */
  const handleRemoveBenefit = (benefitId) => {
    setFormData(prev => ({
      ...prev,
      marketing: {
        ...prev.marketing,
        benefits: prev.marketing.benefits.filter(b => b._id !== benefitId)
      }
    }));
  };

  // ============================================================================
  // FORM VALIDATION AND SUBMISSION
  // ============================================================================

  /**
   * Validate entire form
   */
  const validateForm = () => {
    const errors = {};

    // Basic validation
    if (!formData.name?.trim()) {
      errors.name = 'Plan name is required';
    }

    if (!formData.slug?.trim()) {
      errors.slug = 'Plan slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    if (!formData.description?.trim()) {
      errors.description = 'Plan description is required';
    }

    if (!formData.pricing?.price || parseFloat(formData.pricing.price) <= 0) {
      errors.pricing = errors.pricing || {};
      errors.pricing.price = 'Valid price is required';
    }

    if (formData.pricing?.originalPrice && parseFloat(formData.pricing.originalPrice) <= parseFloat(formData.pricing.price)) {
      errors.pricing = errors.pricing || {};
      errors.pricing.originalPrice = 'Original price must be higher than current price';
    }

    if (formData.includedCourses.length === 0) {
      errors.includedCourses = 'At least one course must be included in the plan';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = () => {
    if (!validateForm()) {
      setExpandedSection('basic'); // Show errors in basic section
      return;
    }

    // Map to server-expected field names
    const apiData = {
      ...formData,
      // Map pricing.price to monthlyPrice (server expectation)
      monthlyPrice: parseFloat(formData.pricing.price),
      // Map pricing.originalPrice to yearlyPrice if it exists
      yearlyPrice: formData.pricing.originalPrice ? parseFloat(formData.pricing.originalPrice) : undefined,
      // Map includedCourses objects to coursesIncluded strings
      coursesIncluded: formData.includedCourses.map(course => course.courseId),
      pricing: {
        ...formData.pricing,
        price: parseFloat(formData.pricing.price),
        originalPrice: formData.pricing.originalPrice ? parseFloat(formData.pricing.originalPrice) : undefined,
        discountPercentage: formData.pricing.discountPercentage || 0,
        trialPeriod: parseInt(formData.pricing.trialPeriod || 0),
        setupFee: parseFloat(formData.pricing.setupFee || 0)
      },
      business: {
        ...formData.business,
        sortOrder: parseInt(formData.business.sortOrder || 0),
        maxSubscriptions: formData.business.maxSubscriptions ? parseInt(formData.business.maxSubscriptions) : undefined,
        maxEnrollments: formData.business.maxEnrollments ? parseInt(formData.business.maxEnrollments) : undefined
      },
      features: {
        ...formData.features,
        mentoringSessions: parseInt(formData.features.mentoringSessions || 0),
        liveWebinars: parseInt(formData.features.liveWebinars || 0)
      }
    };

    // Include createdBy for new plans
    if (createdBy && !plan) {
      apiData.audit = {
        createdBy: createdBy
      };
    }

    console.log('Submitting plan data:', apiData);
    onSubmit(apiData);
  };

  // ============================================================================
  // UI RENDERING HELPERS
  // ============================================================================

  const availableCourses = courses.filter(course => !selectedCourses[course._id]);
  const selectedCoursesList = courses.filter(course => selectedCourses[course._id]);
  const totalSelectedCourses = selectedCoursesList.length;

  // ============================================================================
  // RENDER COMPONENT
  // ============================================================================

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Loading Overlay */}
      {loading && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 10
        }}>
          <CircularProgress />
        </Box>
      )}

      {/* Form Sections */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>

        {/* ============================================================================ */}
        {/* BASIC INFORMATION */}
        {/* ============================================================================ */}

        <Accordion
          expanded={expandedSection === 'basic'}
          onChange={() => setExpandedSection(expandedSection === 'basic' ? 'pricing' : 'basic')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Basic Information</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Plan Name"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  error={!!validationErrors.name}
                  helperText={validationErrors.name}
                  required
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Plan Slug"
                  value={formData.slug}
                  onChange={(e) => handleFieldChange('slug', e.target.value)}
                  error={!!validationErrors.slug}
                  helperText={validationErrors.slug || 'URL-friendly identifier'}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  error={!!validationErrors.description}
                  helperText={validationErrors.description}
                  placeholder="Describe what this subscription plan offers..."
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Short Description"
                  value={formData.shortDescription}
                  onChange={(e) => handleFieldChange('shortDescription', e.target.value)}
                  helperText="Brief description for listings and marketing"
                  placeholder="One-line description for plan previews..."
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ============================================================================ */}
        {/* PRICING CONFIGURATION */}
        {/* ============================================================================ */}

        <Accordion
          expanded={expandedSection === 'pricing'}
          onChange={() => setExpandedSection(expandedSection === 'pricing' ? 'courses' : 'pricing')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PriceIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Pricing Configuration</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={formData.pricing.currency}
                    label="Currency"
                    onChange={(e) => handlePricingChange('currency', e.target.value)}
                  >
                    <MenuItem value="INR">Indian Rupee (₹)</MenuItem>
                    <MenuItem value="USD">US Dollar ($)</MenuItem>
                    <MenuItem value="EUR">Euro (€)</MenuItem>
                    <MenuItem value="GBP">British Pound (£)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Plan Price"
                  value={formData.pricing.price}
                  onChange={(e) => handlePricingChange('price', e.target.value)}
                  error={!!validationErrors.pricing?.price}
                  helperText={validationErrors.pricing?.price || 'Base price for the plan'}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>{formData.pricing.currency === 'INR' ? '₹' :
                                                                     formData.pricing.currency === 'USD' ? '$' :
                                                                     formData.pricing.currency === 'EUR' ? '€' :
                                                                     formData.pricing.currency === 'GBP' ? '£' : ''}</Typography>
                  }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Original Price (Optional)"
                  value={formData.pricing.originalPrice}
                  onChange={(e) => handlePricingChange('originalPrice', e.target.value)}
                  error={!!validationErrors.pricing?.originalPrice}
                  helperText={validationErrors.pricing?.originalPrice || 'Show discount if greater than plan price'}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Billing Cycle</InputLabel>
                  <Select
                    value={formData.pricing.billingCycle}
                    label="Billing Cycle"
                    onChange={(e) => handlePricingChange('billingCycle', e.target.value)}
                  >
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                    <MenuItem value="lifetime">Lifetime</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {formData.pricing.originalPrice > 0 && formData.pricing.originalPrice > formData.pricing.price && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography>
                  <strong>Discount:</strong> {formData.pricing.discountPercentage}% off original price
                </Typography>
              </Alert>
            )}
          </AccordionDetails>
        </Accordion>

        {/* ============================================================================ */}
        {/* COURSE SELECTION */}
        {/* ============================================================================ */}

        <Accordion
          expanded={expandedSection === 'courses'}
          onChange={() => setExpandedSection(expandedSection === 'courses' ? 'features' : 'courses')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CourseIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                Course Selection ({totalSelectedCourses} of {courses.length} courses selected)
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {/* Debug Information */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Debug Info:
              </Typography>
              <Typography variant="body2">
                Available Courses: {courses.length} | Selected Courses: {Object.keys(selectedCourses).length} | Included in Plan: {formData.includedCourses.length}
              </Typography>
            </Alert>

            {courses.length === 0 ? (
              <Alert severity="warning">
                No courses available. Please create courses first before setting up subscription plans.
              </Alert>
            ) : (
              <>
                {/* Selected Courses */}
                {selectedCoursesList.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'success.main' }}>
                      ✅ Selected Courses ({selectedCoursesList.length})
                    </Typography>
                    <Grid container spacing={2}>
                      {selectedCoursesList.map((course) => {
                        const isMissing = !course || course.isMissing;
                        return (
                          <Grid item xs={12} md={6} key={course._id || course.courseId}>
                            <Card sx={{
                              border: '2px solid',
                              borderColor: isMissing ? 'warning.main' : 'success.main',
                              bgcolor: isMissing ? 'warning.50' : 'success.50'
                            }}>
                              <CardContent sx={{ pb: 2, '&.MuiCardContent-root:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body1" fontWeight="medium">
                                      {course.title || course.courseName}
                                      {isMissing && (
                                        <Typography component="span" variant="caption" sx={{ ml: 1, color: 'warning.main' }}>
                                          (Not Available)
                                        </Typography>
                                      )}
                                    </Typography>
                                    <Typography variant="body2" color={isMissing ? "warning.main" : "text.secondary"}>
                                      {isMissing
                                        ? "This course has been deleted or is no longer available"
                                        : `${course.instructor} • ${course.difficulty} • ${course.duration} min`
                                      }
                                    </Typography>
                                  </Box>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={true}
                                        onChange={() => handleCourseToggle(course._id || course.courseId)}
                                        color={isMissing ? "warning" : "success"}
                                      />
                                    }
                                    label=""
                                  />
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                )}

                {/* Available Courses */}
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                    📚 Available Courses ({availableCourses.length})
                  </Typography>
                  {availableCourses.length === 0 ? (
                    <Alert severity="info">
                      All available courses have been selected for this plan.
                    </Alert>
                  ) : (
                    <Grid container spacing={2}>
                      {availableCourses.map((course) => (
                        <Grid item xs={12} md={6} key={course._id}>
                          <Card sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            '&:hover': { borderColor: 'primary.main' }
                          }}>
                            <CardContent sx={{ pb: 2, '&.MuiCardContent-root:last-child': { pb: 2 } }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body1" fontWeight="medium">
                                    {course.title}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {course.instructor} • {course.difficulty} • {course.duration} min
                                  </Typography>
                                </Box>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={false}
                                      onChange={() => handleCourseToggle(course._id)}
                                      color="primary"
                                    />
                                  }
                                  label=""
                                />
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>

                {validationErrors.includedCourses && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {validationErrors.includedCourses}
                  </Alert>
                )}
              </>
            )}
          </AccordionDetails>
        </Accordion>

        {/* ============================================================================ */}
        {/* FEATURES CONFIGURATION */}
        {/* ============================================================================ */}

        <Accordion
          expanded={expandedSection === 'features'}
          onChange={() => setExpandedSection(expandedSection === 'features' ? 'business' : 'features')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Features & Benefits</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Content Features */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  📚 Content Access
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.features.unlimitedLectures}
                      onChange={(e) => handleFeatureToggle('unlimitedLectures', e.target.checked)}
                    />
                  }
                  label="Unlimited lecture access"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.features.downloadableContent}
                      onChange={(e) => handleFeatureToggle('downloadableContent', e.target.checked)}
                    />
                  }
                  label="Downloadable course materials"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.features.certificates}
                      onChange={(e) => handleFeatureToggle('certificates', e.target.checked)}
                    />
                  }
                  label="Certificate upon completion"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.features.offlineAccess}
                      onChange={(e) => handleFeatureToggle('offlineAccess', e.target.checked)}
                    />
                  }
                  label="Offline course access"
                />
              </Grid>

              {/* Learning Features */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ my: 2, fontWeight: 600 }}>
                  🎓 Learning Features
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.features.progressTracking}
                      onChange={(e) => handleFeatureToggle('progressTracking', e.target.checked)}
                    />
                  }
                  label="Progress tracking"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.features.quizzesAssessments}
                      onChange={(e) => handleFeatureToggle('quizzesAssessments', e.target.checked)}
                    />
                  }
                  label="Quizzes and assessments"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.features.customLearningPaths}
                      onChange={(e) => handleFeatureToggle('customLearningPaths', e.target.checked)}
                    />
                  }
                  label="Custom learning paths"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.features.practiceExercises}
                      onChange={(e) => handleFeatureToggle('practiceExercises', e.target.checked)}
                    />
                  }
                  label="Practice exercises"
                />
              </Grid>

              {/* Support Features */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ my: 2, fontWeight: 600 }}>
                  💬 Support & Resources
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.features.prioritySupport}
                      onChange={(e) => handleFeatureToggle('prioritySupport', e.target.checked)}
                    />
                  }
                  label="Priority support"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.features.communityAccess}
                      onChange={(e) => handleFeatureToggle('communityAccess', e.target.checked)}
                    />
                  }
                  label="Community forum access"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Mentoring Sessions (per month)"
                  value={formData.features.mentoringSessions}
                  onChange={(e) => handleFeatureToggle('mentoringSessions', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 12 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Live Webinars (per month)"
                  value={formData.features.liveWebinars}
                  onChange={(e) => handleFeatureToggle('liveWebinars', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 52 }}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ============================================================================ */}
        {/* BUSINESS RULES */}
        {/* ============================================================================ */}

        <Accordion
          expanded={expandedSection === 'business'}
          onChange={() => setExpandedSection(expandedSection === 'business' ? 'marketing' : 'business')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Business Configuration</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Visibility & Status */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  🎯 Visibility & Status
                </Typography>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.business.isActive}
                      onChange={(e) => handleBusinessChange('isActive', e.target.checked)}
                    />
                  }
                  label="Plan is active"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.business.isVisible}
                      onChange={(e) => handleBusinessChange('isVisible', e.target.checked)}
                    />
                  }
                  label="Visible to users"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.business.isPopular}
                      onChange={(e) => handleBusinessChange('isPopular', e.target.checked)}
                    />
                  }
                  label="Mark as popular"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.business.isRecommended}
                      onChange={(e) => handleBusinessChange('isRecommended', e.target.checked)}
                    />
                  }
                  label="Recommended plan"
                />
              </Grid>

              {/* Display Settings */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ my: 2, fontWeight: 600 }}>
                  🎨 Display Settings
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Sort Order"
                  value={formData.business.sortOrder}
                  onChange={(e) => handleBusinessChange('sortOrder', parseInt(e.target.value) || 0)}
                  helperText="Lower numbers appear first in listings"
                  inputProps={{ min: 0, max: 999 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Target Skill Level</InputLabel>
                  <Select
                    multiple
                    value={formData.business.skillLevels}
                    onChange={(e) => handleBusinessChange('skillLevels', e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="Beginner">Beginner</MenuItem>
                    <MenuItem value="Intermediate">Intermediate</MenuItem>
                    <MenuItem value="Advanced">Advanced</MenuItem>
                    <MenuItem value="Expert">Expert</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ============================================================================ */}
        {/* MARKETING CONFIGURATION */}
        {/* ============================================================================ */}

        <Accordion
          expanded={expandedSection === 'marketing'}
          onChange={() => setExpandedSection(expandedSection === 'marketing' ? 'basic' : 'marketing')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <GroupIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Marketing & Benefits</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Badge Text"
                  value={formData.marketing.badgeText}
                  onChange={(e) => handleMarketingChange('badgeText', e.target.value)}
                  helperText="Display badge on plan cards (e.g., 'Best Value')"
                  inputProps={{ maxLength: 20 }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Call to Action"
                  value={formData.marketing.callToAction}
                  onChange={(e) => handleMarketingChange('callToAction', e.target.value)}
                  helperText="Button text for subscriptions"
                  inputProps={{ maxLength: 30 }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ my: 2, fontWeight: 600 }}>
                  ✨ Plan Benefits & Features
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    placeholder="Add a plan benefit or feature..."
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBenefit();
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddBenefit}
                    disabled={!benefitInput.trim()}
                  >
                    <AddIcon />
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.marketing.benefits.map((benefit, index) => (
                    <Chip
                      key={benefit._id || index}
                      label={benefit.title}
                      onDelete={() => handleRemoveBenefit(benefit._id || benefit.title)}
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ============================================================================ */}
        {/* FORM ACTIONS */}
        {/* ============================================================================ */}

        <Divider sx={{ my: 3 }} />

        <Box sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          p: 2,
          borderTop: 1,
          borderColor: 'divider'
        }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              minWidth: 120,
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Saving...
              </>
            ) : (
              plan ? 'Update Plan' : 'Create Plan'
            )}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

// ============================================================================
// PROP TYPES DEFINITION
// ============================================================================

SubscriptionPlanForm.propTypes = {
  plan: PropTypes.object, // Existing plan for editing
  courses: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      instructor: PropTypes.string,
      difficulty: PropTypes.string,
      duration: PropTypes.number
    })
  ),
  loading: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  createdBy: PropTypes.string // User ID for creating plans
};

export default SubscriptionPlanForm;
