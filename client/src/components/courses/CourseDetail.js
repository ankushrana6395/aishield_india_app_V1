import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const CourseDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isSubscribed } = useAuth();
  const [course, setCourse] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (slug) {
      fetchCourseDetails();
    }
  }, [slug]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/courses/${slug}`);
      setCourse(response.data.course);

      // Select first category by default
      if (response.data.course.categories && response.data.course.categories.length > 0) {
        setSelectedCategory(response.data.course.categories[0]);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      setError('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const handleLectureClick = (lecture) => {
    console.log('🎯 LECTURE CLICK:', {
      lectureId: lecture._id,
      lectureTitle: lecture.title,
      contentId: lecture.contentId,
      courseId: course._id,
      courseSlug: course.slug,
      hasAccess: course.access?.canEnroll && isSubscribed
    });

    // Validate course access before showing lectures
    if (!course.access?.canEnroll || !isSubscribed) {
      console.log('❌ LECTURE ACCESS DENIED: User not enrolled or subscribed');
      setError('You must be subscribed and enrolled in this course to access lectures');
      return;
    }

    if (!lecture.contentId) {
      console.log('❌ LECTURE ACCESS FAILED: No content ID for lecture');
      setError('Lecture content is not available');
      return;
    }

    // Ensure lecture belongs to this course (additional security)
    const lectureBelongsToCourse = selectedCategory?.lectures.some(l => l._id === lecture._id);
    if (!lectureBelongsToCourse) {
      console.log('❌ LECTURE SECURITY VIOLATION: Lecture does not belong to this course category');
      setError('Lecture access denied - invalid lecture for this course');
      return;
    }

    console.log('✅ LECTURE ACCESS GRANTED: Navigating to lecture content');
    // Navigate to lecture viewer using content ID
    navigate(`/lecture/${lecture.contentId.filename}`);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a1121',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;900&family=Roboto:wght@300;400;500;700&display=swap');

            .loading-spinner {
              display: inline-block;
              width: 50px;
              height: 50px;
              border: 5px solid rgba(10, 17, 33, 0.3);
              border-radius: 50%;
              border-top-color: #00ff88;
              animation: spin 1s ease-in-out infinite;
            }

            @keyframes spin {
              to { transform: rotate(360deg); }
            }

            .loading-text {
              color: #e0e0e0;
              font-family: 'Orbitron', sans-serif;
              margin-top: 20px;
              text-align: center;
            }
          `}
        </style>
        <div>
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading Course...</div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a1121',
        color: '#e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <div>
          <h1 style={{ color: '#ff4444', marginBottom: '20px' }}>Error Loading Course</h1>
          <p>{error || 'Course not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#00aaff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!isSubscribed || !course.access?.isSubscribed) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a1121',
        color: '#e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔒</div>
          <h1 style={{
            fontFamily: 'Orbitron',
            color: '#00ff88',
            marginBottom: '20px'
          }}>
            Course Access Required
          </h1>
          <p style={{ marginBottom: '30px' }}>
            This course requires an active subscription to access.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#00ff88',
              color: '#0a1121',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            View Subscription Plans
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent',
              color: '#00aaff',
              border: '1px solid #00aaff',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
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
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;900&family=Roboto:wght@300;400;500;700&display=swap');

          .course-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }

          .course-header {
            background: linear-gradient(135deg, #111c30 0%, #0a1326 100%);
            border: 1px solid #2a4060;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            boxShadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          }

          .course-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 2.5rem;
            color: #00ff88;
            margin-bottom: 10px;
            text-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
          }

          .course-subtitle {
            font-family: 'Roboto', sans-serif;
            font-size: 1.2rem;
            color: #00aaff;
            marginBottom: '15px';
          }

          .course-description {
            color: '#aaaaaa';
            fontFamily: 'Roboto, sans-serif';
            fontSize: '1rem';
            lineHeight: '1.6';
            marginBottom: '20px';
          }

          .course-meta {
            display: flex;
            gap: 30px;
            flex-wrap: wrap;
            margin: 20px 0;
          }

          .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: '#cccccc';
          }

          .back-button {
            background: '#111c30';
            color: '#00aaff';
            border: '1px solid #2a4060';
            border-radius: '8px';
            padding: '10px 16px';
            font-family: 'Orbitron', sans-serif;
            cursor: 'pointer';
            transition: all 0.3s ease;
            margin-bottom: '20px';
          }

          .back-button:hover {
            background: '#00aaff';
            color: '#0a1121';
          }

          .categories-section {
            margin-top: 40px;
          }

          .categories-tabs {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 30px;
          }

          .category-tab {
            background: '#111c30';
            color: '#e0e0e0';
            border: '1px solid #2a4060';
            border-radius: '20px';
            padding: '8px 16px';
            font-family: 'Orbitron', sans-serif;
            cursor: 'pointer';
            transition: all 0.3s ease;
          }

          .category-tab.active {
            background: '#00ff88';
            color: '#0a1121';
          }

          .lectures-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
          }

          .lecture-card {
            background: '#111c30';
            border: '1px solid #2a4060';
            border-radius: '12px';
            padding: '20px';
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
            cursor: 'pointer';
          }

          .lecture-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 255, 136, 0.2);
            border-color: '#00ff88';
          }

          .lecture-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.2rem;
            color: '#00ff88';
            margin-bottom: 10px;
          }

          .lecture-type {
            background: rgba(0, 170, 255, 0.1);
            color: '#00aaff';
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-bottom: 15px;
            display: inline-block;
          }

          .view-lecture-btn {
            background: '#00aaff';
            color: 'white';
            border: none;
            border-radius: '4px';
            padding: '8px 16px';
            font-family: 'Orbitron', sans-serif;
            cursor: 'pointer';
            transition: all 0.3s ease;
            width: 100%;
          }

          .view-lecture-btn:hover {
            background: '#0088cc';
            box-shadow: 0 0 15px rgba(0, 170, 255, 0.6);
          }

          .error-message {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid #ff0000;
            border-radius: 8px;
            padding: 15px;
            color: #ff8888;
            margin: 20px 0;
            text-align: center;
          }
        `}
      </style>

      <div className="course-container">
        {/* Back Button */}
        <button
          className="back-button"
          onClick={() => navigate('/dashboard')}
        >
          ← Back to Dashboard
        </button>

        {/* Course Header */}
        <div className="course-header">
          <h1 className="course-title">{course.title}</h1>
          <div className="course-subtitle">{course.instructor}</div>
          <p className="course-description">{course.description}</p>

          <div className="course-meta">
            <div className="meta-item">
              <span>📚</span>
              <span>Difficulty: {course.difficulty}</span>
            </div>
            <div className="meta-item">
              <span>⏱️</span>
              <span>Duration: {Math.floor(course.totalDuration / 60)}h {course.totalDuration % 60}m</span>
            </div>
            <div className="meta-item">
              <span>📖</span>
              <span>{course.totalLectures} Lectures</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {/* Categories and Lectures */}
        <div className="categories-section">
          <h2 style={{
            fontFamily: 'Orbitron',
            fontSize: '2rem',
            color: '#00ff88',
            marginBottom: '20px'
          }}>
            Course Content
          </h2>

          {/* Category Tabs */}
          {course.categories && course.categories.length > 0 && (
            <div className="categories-tabs">
              {course.categories.map((category, index) => (
                <button
                  key={category._id || index}
                  className={`category-tab ${selectedCategory && (selectedCategory._id === category._id || selectedCategory.name === category.name) ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}

          {/* Lectures Grid */}
          {selectedCategory && selectedCategory.lectures && selectedCategory.lectures.length > 0 ? (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  fontFamily: 'Orbitron',
                  fontSize: '1.5rem',
                  color: '#00aaff',
                  margin: 0
                }}>
                  {selectedCategory.name} Lectures
                </h3>
                <div style={{
                  color: '#39ff14',
                  fontSize: '0.9rem',
                  background: 'rgba(57, 255, 20, 0.1)',
                  padding: '4px 12px',
                  borderRadius: '12px'
                }}>
                  {selectedCategory.lectures.length} lecture{selectedCategory.lectures.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="lectures-grid">
                {selectedCategory.lectures
                  .filter(lecture => lecture && lecture.title) // Filter out invalid lectures
                  .sort((a, b) => (a.order || 0) - (b.order || 0)) // Sort by order if available
                  .map((lecture, index) => (
                  <div
                    key={lecture._id || `lecture-${index}`}
                    className="lecture-card"
                    onClick={() => handleLectureClick(lecture)}
                    style={
                      !lecture.contentId ? {
                        opacity: 0.6,
                        cursor: 'not-allowed',
                        border: '1px solid #ff4444'
                      } : {}
                    }
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <h4 className="lecture-title">{lecture.title}</h4>
                      <div style={{ fontSize: '0.7rem', color: '#aaa' }}>
                        #{index + 1}
                      </div>
                    </div>

                    <div className="lecture-type">
                      {lecture.isRequired ? '✨ Required' : '📖 Optional'}
                    </div>

                    {lecture.duration && (
                      <div style={{
                        color: '#888',
                        fontSize: '0.9rem',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        ⏱️ {lecture.duration} min
                      </div>
                    )}

                    {!lecture.contentId && (
                      <div style={{
                        color: '#ff8888',
                        fontSize: '0.8rem',
                        marginBottom: '10px',
                        padding: '4px 8px',
                        border: '1px solid #ff4444',
                        borderRadius: '4px',
                        background: 'rgba(255, 68, 68, 0.1)'
                      }}>
                        Content Not Available
                      </div>
                    )}

                    <button
                      className="view-lecture-btn"
                      disabled={!lecture.contentId}
                    >
                      {lecture.contentId ? 'View Lecture' : 'Content Missing'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : selectedCategory ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#888',
              background: 'linear-gradient(135deg, #111c30 0%, #0a1326 100%)',
              borderRadius: '12px',
              border: '1px solid #2a4060'
            }}>
              <h4 style={{ color: '#e0e0e0', marginBottom: '10px' }}>No Lectures Available</h4>
              <p>This category doesn't have any lectures yet.</p>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#888',
              background: 'linear-gradient(135deg, #111c30 0%, #0a1326 100%)',
              borderRadius: '12px',
              border: '1px solid #2a4060'
            }}>
              <h4 style={{ color: '#e0e0e0', marginBottom: '10px' }}>No Categories Available</h4>
              <p>This course doesn't have any categories or lectures yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
