import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UpdatedLectureUploadForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    courseId: ''
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [categoryStats, setCategoryStats] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Re-filter categories when course selection changes
    console.log('🔄 Course selection changed, updating category options');
    if (selectedCourse) {
      console.log('📚 Selected course categories:', selectedCourse.categories);
      console.log('📁 Total database categories:', categories.length);
    }
  }, [formData.courseId, selectedCourse]);

  const loadData = async () => {
    try {
      const [categoriesRes, coursesRes] = await Promise.all([
        axios.get('/api/admin/categories'),
        axios.get('/api/courses')
      ]);

      setCategories(categoriesRes.data.categories || []);
      setCourses(coursesRes.data.courses || []);

      // Get category statistics for better UX
      const stats = {};
      categoriesRes.data.categories.forEach(cat => {
        stats[cat._id] = cat.lectureCount || 0;
      });
      setCategoryStats(stats);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading categories and courses');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Generate title from filename if not provided
      if (!formData.title) {
        const generatedTitle = selectedFile.name
          .replace('.html', '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());

        setFormData(prev => ({
          ...prev,
          title: generatedTitle
        }));
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setMessage('Please select a file to upload');
      return;
    }

    if (!formData.category) {
      setMessage('Please select a category');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('category', formData.category);

    if (formData.title) uploadData.append('title', formData.title);
    if (formData.description) uploadData.append('description', formData.description);
    if (formData.courseId) uploadData.append('courseId', formData.courseId);

    setUploading(true);
    setMessage('');

    try {
      const response = await axios.post('/api/admin/upload-lecture', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      console.log('Upload successful:', data);

      // Construct detailed success message
      let successMessage = `✅ ${data.message}\n\n`;

      if (data.courseAssignment && data.courseAssignment.isAssigned) {
        successMessage += `📚 Course Assignment: ${data.courseAssignment.courseName}\n`;
      }

      if (data.autoLinking) {
        if (data.autoLinking.successful) {
          successMessage += `🔗 Auto-Linking: ${data.autoLinking.message}\n`;
        } else {
          successMessage += `⚠️ Auto-Linking: ${data.autoLinking.message}\n`;
        }
      }

      successMessage += `\n📄 File: ${data.file.filename} (${(data.file.size/1024).toFixed(1)}KB)`;
      if (data.file.title) {
        successMessage += `\n📝 Title: ${data.file.title}`;
      }

      setMessage(successMessage);

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        courseId: ''
      });
      setFile(null);

      // Clear file input
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.value = '';

      // Refresh category stats
      loadData();

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || 'Upload failed';
      setMessage(`❌ ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  // Always show all categories from the database, filtered by active status if applicable
  // The auto-linking system will handle the relationship between content and course
  const selectedCourse = courses.find(c => c._id === formData.courseId);
  const relevantCategories = categories; // Always show all available categories

  console.log('📁 CATEGORY SELECTION DEBUG:');
  console.log('   Selected course:', selectedCourse ? selectedCourse.title : 'None');
  console.log('   Total database categories:', categories.length);
  console.log('   Showing all database categories (auto-linking will handle course association)');

  categories.forEach((cat, index) => {
    console.log(`   ${index + 1}. ${cat.name} (ID: ${cat._id})`);
  });

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      background: '#1a1a2e',
      borderRadius: '10px',
      color: 'white'
    }}>
      <h2 style={{ color: '#00ff88', marginBottom: '20px' }}>Upload Lecture with Auto-Linking</h2>

      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: message.includes('✅') ? '#2d5016' : '#4a1c1a',
          border: `1px solid ${message.includes('✅') ? '#00ff88' : '#ff4444'}`,
          whiteSpace: 'pre-line',
          color: message.includes('✅') ? '#00ff88' : '#ff8888'
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

        {/* Course Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: '#00aaff' }}>
            📚 Select Course (Optional - enables auto-linking)
          </label>
          <select
            name="courseId"
            value={formData.courseId}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '8px',
              background: '#2a2a4e',
              border: '1px solid #444',
              borderRadius: '4px',
              color: 'white'
            }}
          >
            <option value="">No specific course (general upload)</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.title} ({course.slug})
              </option>
            ))}
          </select>
          {selectedCourse && (
            <div style={{
              marginTop: '5px',
              fontSize: '0.8rem',
              color: '#00ff88'
            }}>
              ✅ Auto-linking enabled for: {selectedCourse.title}
            </div>
          )}
        </div>

        {/* Category Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: '#00aaff' }}>
            📁 Category *
            {selectedCourse && (
              <span style={{ color: '#00ff88' }}> (all database categories - auto-linked to course)</span>
            )}
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
            style={{
              width: '100%',
              padding: '8px',
              background: '#2a2a4e',
              border: '1px solid #444',
              borderRadius: '4px',
              color: 'white'
            }}
          >
            <option value="">Select Category</option>
            {relevantCategories.map(category => {
              const categoryId = category._id || category.name;
              const categoryName = category.name || category;

              console.log(`🗂️ Category option: "${categoryName}" (value: ${categoryId})`);
              console.log('   Category object:', category);

              return (
                <option key={categoryId} value={categoryId}>
                  {categoryName}
                </option>
              );
            })}
          </select>
        </div>

        {/* File Upload */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: '#00aaff' }}>
            📄 HTML File *
          </label>
          <input
            id="fileInput"
            type="file"
            accept=".html,.htm"
            onChange={handleFileChange}
            required
            style={{
              width: '100%',
              padding: '8px',
              background: '#2a2a4e',
              border: '1px solid #444',
              borderRadius: '4px',
              color: 'white'
            }}
          />
          {file && (
            <div style={{ marginTop: '5px', fontSize: '0.9rem', color: '#00ff88' }}>
              📄 Selected: {file.name} ({(file.size/1024).toFixed(1)}KB)
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: '#00aaff' }}>
            📝 Title
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Auto-generated from filename if empty"
            style={{
              width: '100%',
              padding: '8px',
              background: '#2a2a4e',
              border: '1px solid #444',
              borderRadius: '4px',
              color: 'white'
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: '#00aaff' }}>
            📋 Description (Optional)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="3"
            style={{
              width: '100%',
              padding: '8px',
              background: '#2a2a4e',
              border: '1px solid #444',
              borderRadius: '4px',
              color: 'white',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading}
          style={{
            padding: '10px 20px',
            background: uploading ? '#666' : '#00ff88',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            marginTop: '10px'
          }}
        >
          {uploading ? '🔄 Uploading...' : '🚀 Upload & Link Lecture'}
        </button>

      </form>

      {/* Help Section */}
      <div style={{
        marginTop: '30px',
        padding: '15px',
        background: '#2a2a4e',
        borderRadius: '6px',
        border: '1px solid #444'
      }}>
        <h3 style={{ color: '#00aaff', marginTop: '0' }}>📚 Upload Guide:</h3>
        <ul style={{ color: '#cccccc', marginBottom: '0', paddingLeft: '20px' }}>
          <li><strong>Course Selection:</strong> Optional - selects which course this content belongs to</li>
          <li><strong>Category Selection:</strong> Always shows ALL categories from database (not course-specific)</li>
          <li><strong>Auto-Linking Magic:</strong> Content gets automatically linked to chosen course's lecture structure</li>
          <li><strong>Success Feedback:</strong> See console for upload & auto-linking details</li>
          <li><strong>Your Categories:</strong> WebPentesting, Basic, Practical are shown in the dropdown</li>
        </ul>
      </div>
    </div>
  );
};

export default UpdatedLectureUploadForm;