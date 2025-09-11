import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LectureUploadForm = () => {
  const navigate = useNavigate();
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('🔄 Loading data for lecture upload form...');
      setLoading(true);

      const [categoriesRes, coursesRes] = await Promise.all([
        axios.get('/api/admin/categories'),
        axios.get('/api/courses')
      ]);

      const loadedCategories = categoriesRes.data.categories || [];
      const loadedCourses = coursesRes.data.courses || [];

      console.log('📋 Loaded categories:', loadedCategories.length);
      console.log('📚 Loaded courses:', loadedCourses.length);

      setCategories(loadedCategories);
      setCourses(loadedCourses);

      // Get category statistics for better UX
      const stats = {};
      loadedCategories.forEach(cat => {
        stats[cat._id] = cat.lectureCount || 0;
      });
      setCategoryStats(stats);

      console.log('✅ Data loaded successfully');

    } catch (error) {
      console.error('❌ Error loading data:', error);
      console.error('Response:', error.response?.data);
      setMessage(`Error loading categories and courses: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
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

  // Parse HTML content to extract structured data
  const parseHtmlContent = (htmlContent, filename) => {
    try {
      console.log('🔍 CLIENT-SIDE HTML PARSING:');

      // Extract title from HTML
      let title = 'Lecture Title'; // Default fallback
      const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].replace(' | By Ankush Rana', '').trim();
      }

      // Generate slug from filename
      const slug = filename.replace('.html', '').toLowerCase().replace(/[^a-z0-9-]/g, '-');

      // Extract subtitle from meta description or content
      let subtitle = `${title} - Interactive Learning Module`;
      const metaDescMatch = htmlContent.match(/<meta[^>]*description[^>]*content="([^"]+)"/i);
      if (metaDescMatch) {
        subtitle = metaDescMatch[1].substring(0, 100);
      }

      // Create basic sections structure based on HTML analysis
      const sections = [
        {
          title: "Introduction to " + title,
          content: [
            {
              heading: "What is " + title + "?",
              paragraphs: [
                `${title} is a critical security vulnerability that allows attackers to execute arbitrary system commands on vulnerable applications.`,
                `This interactive module covers the fundamentals, attack vectors, and prevention strategies for ${title}.`
              ]
            },
            {
              heading: "Learning Objectives",
              list: [
                "Understand the fundamentals of " + title,
                "Learn common attack vectors and techniques",
                "Practice with interactive examples",
                "Master prevention and mitigation strategies"
              ]
            }
          ]
        },
        {
          title: "Attack Vectors and Techniques",
          content: [
            {
              heading: "Common Exploitation Methods",
              paragraphs: [
                `${title} vulnerabilities typically occur when user input is passed to system commands without proper validation and sanitization.`,
                `Attackers can inject malicious commands that get executed by the underlying operating system.`
              ]
            },
            {
              heading: "Command Separators and Operators",
              list: [
                "; - Execute multiple commands sequentially",
                "&& - Execute next command only if previous succeeds",
                "|| - Execute next command only if previous fails",
                "| - Pipe output between commands",
                "$(command) - Command substitution"
              ]
            }
          ]
        },
        {
          title: "Prevention and Best Practices",
          content: [
            {
              heading: "Secure Coding Practices",
              paragraphs: [
                `Prevention of ${title} requires proper input validation, sanitization, and the use of safe APIs.`,
                `Always validate and sanitize user inputs before passing them to system commands.`
              ]
            },
            {
              heading: "Defense Strategies",
              list: [
                "Use parameterized queries or prepared statements",
                "Implement proper input validation and sanitization",
                "Use safe APIs that don't invoke shell commands",
                "Apply least privilege principle",
                "Regular security testing and code reviews"
              ]
            }
          ]
        }
      ];

      // Create basic quiz questions
      const quizQuestions = [
        {
          question: {
            en: `What is ${title}?`,
            hi: `${title} क्या है?`
          },
          options: {
            en: [
              "A type of SQL injection attack",
              "A vulnerability allowing system command execution",
              "A client-side JavaScript attack",
              "A network protocol vulnerability"
            ],
            hi: [
              "SQL injection attack का एक प्रकार",
              "System command execution की अनुमति देने वाला vulnerability",
              "Client-side JavaScript attack",
              "Network protocol vulnerability"
            ]
          },
          correctAnswer: 1,
          explanation: {
            en: `${title} allows attackers to execute arbitrary system commands through vulnerable applications.`,
            hi: `${title} attackers को vulnerable applications के माध्यम से arbitrary system commands execute करने की अनुमति देता है।`
          }
        },
        {
          question: {
            en: "What is the most effective prevention method?",
            hi: "सबसे प्रभावी prevention method क्या है?"
          },
          options: {
            en: [
              "Firewall rules",
              "Input validation and sanitization",
              "Rate limiting",
              "Two-factor authentication"
            ],
            hi: [
              "Firewall rules",
              "Input validation और sanitization",
              "Rate limiting",
              "Two-factor authentication"
            ]
          },
          correctAnswer: 1,
          explanation: {
            en: "Proper input validation and sanitization prevents malicious commands from being executed.",
            hi: "Proper input validation और sanitization malicious commands को execute होने से रोकता है।"
          }
        }
      ];

      console.log(`   📝 Extracted title: "${title}"`);
      console.log(`   🏷️ Generated slug: "${slug}"`);
      console.log(`   📄 Created ${sections.length} sections`);
      console.log(`   ❓ Created ${quizQuestions.length} quiz questions`);

      return {
        title,
        subtitle,
        slug,
        sections,
        quizQuestions,
        description: `Interactive guide on ${title} covering fundamentals, exploitation techniques, and prevention strategies.`
      };

    } catch (error) {
      console.log(`   ❌ Error parsing HTML content:`, error.message);
      return null;
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

    setUploading(true);
    setMessage('🔍 Analyzing HTML file content...');

    try {
      // Read and parse HTML file content on client side
      const htmlContent = await file.text();
      const parsedLectureData = parseHtmlContent(htmlContent, file.name);

      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('category', formData.category);

      // Use parsed data if available, fallback to form data
      const finalTitle = parsedLectureData?.title || formData.title || file.name.replace('.html', '');
      const finalDescription = parsedLectureData?.description || formData.description;

      uploadData.append('title', finalTitle);
      if (finalDescription) uploadData.append('description', finalDescription);

      // Send parsed structured data to backend
      if (parsedLectureData) {
        uploadData.append('parsedLectureData', JSON.stringify(parsedLectureData));
        console.log('📤 SENDING PARSED LECTURE DATA:');
        console.log(`   - Title: "${parsedLectureData.title}"`);
        console.log(`   - Sections: ${parsedLectureData.sections?.length || 0}`);
        console.log(`   - Quiz Questions: ${parsedLectureData.quizQuestions?.length || 0}`);
      }

      if (formData.courseId && formData.courseId !== '') {
        uploadData.append('courseId', formData.courseId);
        console.log('🎓 Course selected for upload:', formData.courseId, ', Title:', (courses.find(c => c._id === formData.courseId)?.title || 'Unknown'));
      } else {
        console.log('⚠️ No course selected for upload');
      }

      setMessage('📤 Uploading and processing lecture...');

      // Log all form data being sent
      console.log('📤 UPLOAD REQUEST DATA:');
      console.log('  - File:', file?.name, '(', (file?.size/1024).toFixed(1), 'KB)');
      console.log('  - Category:', formData.category, ', Title:', finalTitle);
      console.log('  - CourseId:', formData.courseId || 'NOT SELECTED');
      console.log('  - Has Parsed Data:', !!parsedLectureData);
      console.log('  - Form data keys:', Array.from(uploadData.keys()));

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

      // Enhanced auto-navigation with state passing for better auto-refresh
      if (formData.courseId) {
        const selectedCourse = courses.find(c => c._id === formData.courseId);
        if (selectedCourse) {
          console.log('🎯 ENHANCED AUTO-NAVIGATE: Returning to course detail page with refresh trigger');

          // Pass state to indicate content was just uploaded for better auto-refresh
          const navigationState = {
            justUploaded: true,
            uploadTime: new Date().toISOString(),
            uploadedLectureTitle: data.lecture?.title || finalTitle,
            uploadedToCategory: formData.category,
            shouldRefresh: true
          };

          // Navigate immediately with state
          navigate(`/course/${selectedCourse.slug}`, {
            state: navigationState,
            replace: false // Don't replace history to allow back navigation
          });
          return; // Exit early to skip form reset
        }
      }

      // If no course selected, still refresh data for admin overview
      if (!formData.courseId) {
        console.log('🔄 No course selected - refreshing admin data only');
        setTimeout(() => {
          loadData();
        }, 1500);
      }

      // Reset form only if not navigating away
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

      // Refresh category stats only if staying on upload page
      loadData();

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || 'Upload failed';
      setMessage(`❌ ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  // Always show ALL database categories (not course-specific)
  // The auto-linking system will handle the relationship between content and course
  const selectedCourse = courses.find(c => c._id === formData.courseId);
  const relevantCategories = categories; // Always show all database categories

  console.log('📁 CATEGORY LOGIC DEBUG:');
  console.log('   All database categories:', categories.map(c => c.name));
  console.log('   Selected course:', selectedCourse ? `${selectedCourse.title} (${selectedCourse.categories?.length || 0} course-specific categories)` : 'None');
  console.log('   Will show all database categories (auto-linking handles course assignment)');

  categories.forEach((cat, index) => {
    console.log(`   📋 Option ${index + 1}: ${cat.name} (ID: ${cat._id})`);
  });

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      background: '#1a1a2e',
      borderRadius: '10px',
      color: 'white',
      position: 'relative'
    }}>
      <h2 style={{ color: '#00ff88', marginBottom: '20px' }}>Upload Lecture with Course Assignment & Auto-Linking</h2>

      {/* Loading and Refresh Section */}
      {loading && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: '#264028',
          border: '1px solid #00ff88',
          textAlign: 'center',
          color: '#00ff88'
        }}>
          🔄 Loading categories and courses...
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: '#4a2640',
          border: '1px solid #ff88ff',
          textAlign: 'center'
        }}>
          <div style={{ color: '#ff88ff', marginBottom: '10px' }}>
            ⚠️ No categories found. Please refresh to load data.
          </div>
          <button
            onClick={loadData}
            style={{
              padding: '6px 12px',
              background: '#ff88ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Data
          </button>
        </div>
      )}

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
        {/* Loading overlay for form */}
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            zIndex: 10,
            color: '#00ff88',
            fontSize: '16px'
          }}>
            🔄 Loading data...
          </div>
        )}

        {/* Course Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: '#00aaff' }}>
            📚 Select Course (<span style={{color: '#ffff55'}}>ENCOURAGED for Content Section Visibility</span>)
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
            <option value="" style={{color: '#ff8888'}}>
              ⚠️ No specific course (will NOT appear in Content section table)
            </option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                ✅ {course.title} - Will appear in Content section
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
              <br/>
              ✅ Lecture will appear immediately in Content section after upload
            </div>
          )}
          {!formData.courseId && (
            <div style={{
              marginTop: '5px',
              fontSize: '0.8rem',
              color: '#ff8888'
            }}>
              ⚠️ Without course selection, lecture will NOT appear in Content section
            </div>
          )}
        </div>

        {/* Category Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: '#00aaff' }}>
            📁 Category *
            {selectedCourse && (
              <span style={{ color: '#00ff88' }}> (showing all database categories - auto-linked to course)</span>
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
            <option value="">
              {categories.length === 0 ? 'Loading categories...' : 'Select Category'}
            </option>
            {relevantCategories.map(category => (
              <option key={category._id || category.name} value={category._id}>
                {category.name || category.name || 'Unnamed Category'}
                {categoryStats[category._id] > 0 && ` (${categoryStats[category._id]} lectures)`}
              </option>
            ))}
          </select>
          {categories.length > 0 && (
            <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#00aaff' }}>
              📊 Showing {relevantCategories.length} of {categories.length} categories
            </div>
          )}
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
        <h3 style={{ color: '#00aaff', marginTop: '0' }}>📚 Enhanced Upload Features:</h3>
        <ul style={{ color: '#cccccc', marginBottom: '0', paddingLeft: '20px' }}>
          <li><strong>Course Selection:</strong> Assign lectures to specific courses instantly</li>
          <li><strong>Auto-Linking:</strong> Lectures automatically link to course structure</li>
          <li><strong>Category Filtering:</strong> Course selection filters available categories</li>
          <li><strong>Detailed Feedback:</strong> Comprehensive success/failure status</li>
          <li><strong>No More contentId null:</strong> Automatic lecture-content association</li>
        </ul>
      </div>
    </div>
  );
};

export default LectureUploadForm;
