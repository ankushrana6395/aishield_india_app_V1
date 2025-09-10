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
  FormControlLabel,
  Checkbox,
  Chip,
  IconButton,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayCircleOutline as PlayIcon
} from '@mui/icons-material';

const CourseForm = ({ course, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    difficulty: 'Beginner',
    instructor: '',
    published: false,
    featured: false,
    tags: [],
    prerequisites: [],
    learningObjectives: [],
    categories: [],
    // SEO fields
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    // Duration in minutes
    duration: 0
  });

  const [currentTag, setCurrentTag] = useState('');
  const [currentPrerequisite, setCurrentPrerequisite] = useState('');
  const [currentObjective, setCurrentObjective] = useState('');
  const [currentCategory, setCurrentCategory] = useState({
    title: '',
    description: '',
    lectures: []
  });

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        slug: course.slug || '',
        description: course.description || '',
        difficulty: course.difficulty || 'Beginner',
        instructor: course.instructor || '',
        published: course.published || false,
        featured: course.featured || false,
        tags: course.tags || [],
        prerequisites: course.prerequisites || [],
        learningObjectives: course.learningObjectives || [],
        categories: course.categories || [],
        metaTitle: course.metaTitle || '',
        metaDescription: course.metaDescription || '',
        keywords: course.keywords || '',
        duration: course.duration || 0
      });
    }
  }, [course]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-generate slug from title
    if (field === 'title') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      setFormData(prev => ({
        ...prev,
        slug: slug
      }));
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addPrerequisite = () => {
    if (currentPrerequisite.trim() && !formData.prerequisites.includes(currentPrerequisite.trim())) {
      setFormData(prev => ({
        ...prev,
        prerequisites: [...prev.prerequisites, currentPrerequisite.trim()]
      }));
      setCurrentPrerequisite('');
    }
  };

  const removePrerequisite = (itemToRemove) => {
    setFormData(prev => ({
      ...prev,
      prerequisites: prev.prerequisites.filter(item => item !== itemToRemove)
    }));
  };

  const addObjective = () => {
    if (currentObjective.trim() && !formData.learningObjectives.includes(currentObjective.trim())) {
      setFormData(prev => ({
        ...prev,
        learningObjectives: [...prev.learningObjectives, currentObjective.trim()]
      }));
      setCurrentObjective('');
    }
  };

  const removeObjective = (itemToRemove) => {
    setFormData(prev => ({
      ...prev,
      learningObjectives: prev.learningObjectives.filter(item => item !== itemToRemove)
    }));
  };

  const addCategory = () => {
    if (currentCategory.title.trim()) {
      setFormData(prev => ({
        ...prev,
        categories: [...prev.categories, currentCategory]
      }));
      setCurrentCategory({
        title: '',
        description: '',
        lectures: []
      });
    }
  };

  const removeCategory = (index) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index)
    }));
  };

  const updateCategory = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) =>
        i === index ? { ...cat, [field]: value } : cat
      )
    }));
  };

  const addLectureToCategory = (categoryIndex) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) =>
        i === categoryIndex
          ? { ...cat, lectures: [...cat.lectures, { title: '', duration: 0, url: '', preview: false }] }
          : cat
      )
    }));
  };

  const updateLecture = (categoryIndex, lectureIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) =>
        i === categoryIndex
          ? {
              ...cat,
              lectures: cat.lectures.map((lec, j) =>
                j === lectureIndex ? { ...lec, [field]: value } : lec
              )
            }
          : cat
      )
    }));
  };

  const removeLecture = (categoryIndex, lectureIndex) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) =>
        i === categoryIndex
          ? { ...cat, lectures: cat.lectures.filter((_, j) => j !== lectureIndex) }
          : cat
      )
    }));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.slug) {
      alert('Title and slug are required');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Box sx={{ p: 2, maxHeight: '70vh', overflowY: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>
        Course Information
      </Typography>

      <Grid container spacing={2}>
        {/* Basic Information */}
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            label="Course Title *"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            variant="outlined"
            required
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Slug *"
            value={formData.slug}
            onChange={(e) => handleInputChange('slug', e.target.value)}
            variant="outlined"
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
            onChange={(e) => handleInputChange('description', e.target.value)}
            variant="outlined"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Difficulty</InputLabel>
            <Select
              value={formData.difficulty}
              label="Difficulty"
              onChange={(e) => handleInputChange('difficulty', e.target.value)}
            >
              <MenuItem value="Beginner">Beginner</MenuItem>
              <MenuItem value="Intermediate">Intermediate</MenuItem>
              <MenuItem value="Advanced">Advanced</MenuItem>
              <MenuItem value="Expert">Expert</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Instructor"
            value={formData.instructor}
            onChange={(e) => handleInputChange('instructor', e.target.value)}
            variant="outlined"
          />
        </Grid>


        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Total Duration (minutes)"
            value={formData.duration}
            onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
            variant="outlined"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.published}
                onChange={(e) => handleInputChange('published', e.target.checked)}
              />
            }
            label="Published"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.featured}
                onChange={(e) => handleInputChange('featured', e.target.checked)}
              />
            }
            label="Featured Course"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Tags */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Tags</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          {formData.tags.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              onDelete={() => removeTag(tag)}
              size="small"
            />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Add tag"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            sx={{ flex: 1 }}
          />
          <Button size="small" onClick={addTag} variant="outlined">Add</Button>
        </Box>
      </Box>

      {/* Prerequisites */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Prerequisites</Typography>
        <Box sx={{ mb: 2 }}>
          {formData.prerequisites.map((prereq, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PlayIcon color="action" />
              <Typography variant="body2">{prereq}</Typography>
              <IconButton size="small" onClick={() => removePrerequisite(prereq)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Add prerequisite"
            value={currentPrerequisite}
            onChange={(e) => setCurrentPrerequisite(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPrerequisite())}
            sx={{ flex: 1 }}
          />
          <Button size="small" onClick={addPrerequisite} variant="outlined">Add</Button>
        </Box>
      </Box>

      {/* Learning Objectives */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Learning Objectives</Typography>
        <Box sx={{ mb: 2 }}>
          {formData.learningObjectives.map((objective, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PlayIcon color="action" />
              <Typography variant="body2">{objective}</Typography>
              <IconButton size="small" onClick={() => removeObjective(objective)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Add learning objective"
            value={currentObjective}
            onChange={(e) => setCurrentObjective(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
            sx={{ flex: 1 }}
          />
          <Button size="small" onClick={addObjective} variant="outlined">Add</Button>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Categories and Lectures */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Course Content</Typography>

        <Card sx={{ mb: 2, p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Add New Category</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                label="Category Title"
                value={currentCategory.title}
                onChange={(e) => setCurrentCategory(prev => ({ ...prev, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Description"
                value={currentCategory.description}
                onChange={(e) => setCurrentCategory(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={1}>
              <Button
                fullWidth
                onClick={addCategory}
                variant="contained"
                disabled={!currentCategory.title.trim()}
              >
                Add
              </Button>
            </Grid>
          </Grid>
        </Card>

        <Typography variant="subtitle2" sx={{ mb: 2 }}>Existing Categories:</Typography>
        {formData.categories.map((category, categoryIndex) => (
          <Card key={categoryIndex} sx={{ mb: 2, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1">{category.title}</Typography>
              <IconButton size="small" onClick={() => removeCategory(categoryIndex)}>
                <DeleteIcon />
              </IconButton>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              label="Description"
              value={category.description}
              onChange={(e) => updateCategory(categoryIndex, 'description', e.target.value)}
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" sx={{ mb: 1 }}>Lectures:</Typography>
            {category.lectures.map((lecture, lectureIndex) => (
              <Box key={lectureIndex} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Lecture Title"
                      value={lecture.title}
                      onChange={(e) => updateLecture(categoryIndex, lectureIndex, 'title', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Duration (min)"
                      value={lecture.duration}
                      onChange={(e) => updateLecture(categoryIndex, lectureIndex, 'duration', parseInt(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="URL/Path"
                      value={lecture.url}
                      onChange={(e) => updateLecture(categoryIndex, lectureIndex, 'url', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={4} md={1}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={lecture.preview}
                          onChange={(e) => updateLecture(categoryIndex, lectureIndex, 'preview', e.target.checked)}
                        />
                      }
                      label="Preview"
                    />
                  </Grid>
                  <Grid item xs={2} md={1}>
                    <IconButton size="small" onClick={() => removeLecture(categoryIndex, lectureIndex)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            ))}

            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => addLectureToCategory(categoryIndex)}
              variant="outlined"
            >
              Add Lecture
            </Button>
          </Card>
        ))}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* SEO Fields */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>SEO & Social Media</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Meta Title"
              value={formData.metaTitle}
              onChange={(e) => handleInputChange('metaTitle', e.target.value)}
              variant="outlined"
              helperText={`${formData.metaTitle.length}/60 characters`}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Keywords"
              value={formData.keywords}
              onChange={(e) => handleInputChange('keywords', e.target.value)}
              variant="outlined"
              helperText="Comma-separated keywords"
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Meta Description"
              value={formData.metaDescription}
              onChange={(e) => handleInputChange('metaDescription', e.target.value)}
              variant="outlined"
              helperText={`${formData.metaDescription.length}/160 characters`}
              size="small"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Submit Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
        <Button onClick={onCancel} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained">
          {course ? 'Update Course' : 'Create Course'}
        </Button>
      </Box>
    </Box>
  );
};

export default CourseForm;
