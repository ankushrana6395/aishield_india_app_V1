import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const CourseDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isSubscribed, getAuthHeaders } = useAuth();
  const [course, setCourse] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [justUploaded, setJustUploaded] = useState(false);
  const [uploadedLectureInfo, setUploadedLectureInfo] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Check for navigation state indicating content was just uploaded
    if (location.state?.justUploaded) {
      console.log('🎯 DETECTED UPLOAD RETURN: Content was just uploaded');
      console.log('Upload info:', location.state);

      setJustUploaded(true);
      setUploadedLectureInfo({
        title: location.state.uploadedLectureTitle,
        category: location.state.uploadedToCategory,
        uploadTime: location.state.uploadTime
      });

      // Trigger immediate refresh with better feedback
  

      // Clear the navigation state to prevent re-triggering
      window.history.replaceState(null, '');
    }

    if (slug) {
      fetchCourseDetails();
    }

    // Enhanced auto-refresh mechanisms
    const handleFocus = () => {
      console.log('🔄 AUTO-REFRESH: User focused back on course page');
      if (!isRefreshing) {
        refreshCourseData();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isRefreshing) {
        console.log('🔄 AUTO-REFRESH: Page became visible');
        refreshCourseData();
      }
    };

    // Listen for multiple refresh triggers
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [slug, refreshTrigger]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      console.log('🔍 FETCHING COURSE DETAILS FOR:', slug);

      const authHeaders = getAuthHeaders();
      const response = await axios.get(`/api/courses/${slug}`, {
        headers: authHeaders
      });
      console.log('📦 COURSE API RESPONSE:', {
        status: response.status,
        courseTitle: response.data.course.title,
        totalLectures: response.data.course.totalLectures,
        categoriesCount: response.data.course.categories?.length || 0,
        access: response.data.course.access
      });

      setCourse(response.data.course);

      // Select first category by default
      if (response.data.course.categories && response.data.course.categories.length > 0) {
        console.log('🎯 SETTING FIRST CATEGORY:', response.data.course.categories[0].name);
        setSelectedCategory(response.data.course.categories[0]);
      } else {
        console.log('⚠️ NO CATEGORIES FOUND TO SELECT');
      }

      // Update last refreshed timestamp
      setLastRefreshed(new Date());
      console.log('✅ COURSE DETAILS FETCHED SUCCESSFULLY');
    } catch (error) {
      console.error('❌ ERROR FETCHING COURSE:', error);
      console.error('Error details:', error.response?.data);

      // Provide more specific error messages
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You may not have permission to view this course.');
      } else if (error.response?.status === 404) {
        setError('Course not found.');
      } else {
        setError(error.response?.data?.message || 'Failed to load course details. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshCourseData = async () => {
    if (isRefreshing) {
      console.log('🔄 REFRESH ALREADY IN PROGRESS, SKIPPING');
      return;
    }

    console.log('🔄 REFRESHING COURSE DATA:', slug);
    setIsRefreshing(true);
    setError(''); // Clear any existing errors

    try {
      // Simulate network delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      setRefreshTrigger(prev => prev + 1);
      setLastRefreshed(new Date());

      // Clear upload notification after refresh
      if (justUploaded) {
        setTimeout(() => {
          setJustUploaded(false);
          setUploadedLectureInfo(null);
        }, 3000);
      }

      console.log('✅ COURSE DATA REFRESHED SUCCESSFULLY');
    } catch (error) {
      console.error('❌ REFRESH ERROR:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Enhanced immediate refresh for upload returns
  const handleUploadReturnRefresh = async () => {
    console.log('🎯 IMMEDIATE REFRESH: Returning from upload');
    setIsRefreshing(true);

    try {
      // Multiple refresh attempts with exponential backoff
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`🔄 REFRESH ATTEMPT ${attempt}/3`);

        await new Promise(resolve => setTimeout(resolve, attempt * 500));
        setRefreshTrigger(prev => prev + 1);

        // Wait for data to load
        await new Promise(resolve => setTimeout(resolve, 1000));

        setLastRefreshed(new Date());

        // Check if we have lectures now
        if (course && course.totalLectures > 0) {
          console.log('✅ LECTURES DETECTED: Auto-refresh successful');
          break;
        }
      }
    } catch (error) {
      console.error('❌ IMMEDIATE REFRESH ERROR:', error);
    } finally {
      setIsRefreshing(false);
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
    const hasAccess = isSubscribed && course.access?.isSubscribed && course.access?.canEnroll;
    if (!hasAccess) {
      console.log('❌ LECTURE ACCESS DENIED:', {
        isSubscribed,
        courseAccess: course.access?.isSubscribed,
        canEnroll: course.access?.canEnroll
      });
      setError('You must be subscribed and enrolled in this course to access lectures');
      return;
    }

    // Improve contentId validation
    const hasValidContent = lecture.contentId &&
      (typeof lecture.contentId === 'string' ||
       (typeof lecture.contentId === 'object' && lecture.contentId.filename));

    console.log('📄 LECTURE CONTENT VALIDATION:', {
      contentId: lecture.contentId,
      type: typeof lecture.contentId,
      hasValidContent,
      filename: typeof lecture.contentId === 'object' ? lecture.contentId.filename : lecture.contentId
    });

    if (!hasValidContent) {
      console.log('❌ LECTURE ACCESS FAILED: Invalid or missing content ID');
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

    // Handle different contentId formats (string vs object)
    let lectureUrl;
    if (typeof lecture.contentId === 'string') {
      lectureUrl = lecture.contentId;
    } else if (typeof lecture.contentId === 'object' && lecture.contentId.filename) {
      lectureUrl = lecture.contentId.filename;
    } else {
      console.error('❌ INVALID CONTENT ID FORMAT:', lecture.contentId);
      setError('Unable to navigate to lecture - invalid content format');
      return;
    }

    console.log('🎯 NAVIGATING TO:', `/lecture/${lectureUrl}`);
    navigate(`/lecture/${lectureUrl}`);
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
              color: '#e0e0e0';
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

  // Improved access control: check both auth state and course permissions
  const hasAccessToCourse = isSubscribed && course.access?.isSubscribed && course.access?.canEnroll;

  console.log('🔐 COURSE ACCESS CHECK:', {
    isSubscribed,
    courseAccess: course.access?.isSubscribed,
    canEnroll: course.access?.canEnroll,
    finalAccess: hasAccessToCourse
  });

  if (!hasAccessToCourse) {
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

  console.log('🎨 COMPONENT RENDER:', {
    course: !!course,
    courseTitle: course?.title,
    selectedCategory: selectedCategory?.name,
    totaleCategories: course?.categories?.length || 0,
    totalLectures: course?.totalLectures || 0,
    isSubscribed,
    userAccess: course?.access?.isSubscribed,
    userCanEnroll: course?.access?.canEnroll,
    loading,
    error
  });

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

          @keyframes spin {
            0% { transform: translateY(-50%) rotate(0deg); }
            100% { transform: translateY(-50%) rotate(360deg); }
          }
        `}
      </style>

      <div className="course-container">
        {/* Back Button and Refresh Button */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            className="back-button"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={refreshCourseData}
            disabled={loading || isRefreshing}
            style={{
              background: '#111c30',
              color: (loading || isRefreshing) ? '#666' : '#00ff88',
              border: '1px solid #2a4060',
              borderRadius: '8px',
              padding: '10px 16px',
              fontFamily: 'Orbitron',
              cursor: (loading || isRefreshing) ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              position: 'relative'
            }}
          >
            {(loading || isRefreshing) ? '🔄' : '↻'}
            {isRefreshing ? 'Auto-Refreshing...' : loading ? 'Loading...' : 'Refresh Course'}

            {/* Animated loading indicator */}
            {isRefreshing && (
              <div style={{
                position: 'absolute',
                top: '50%',
                right: '10px',
                transform: 'translateY(-50%)',
                width: '12px',
                height: '12px',
                border: '2px solid #00ff88',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
          </button>
          <div style={{
            color: '#888',
            fontSize: '0.8rem',
            fontFamily: 'Roboto',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            📅 Last updated: {lastRefreshed.toLocaleTimeString()}
          </div>
        </div>

        {/* Upload Success Notification */}
        {justUploaded && uploadedLectureInfo && (
          <div style={{
            padding: '15px',
            marginBottom: '20px',
            borderRadius: '8px',
            backgroundColor: '#2d4a1e',
            border: '1px solid #00ff88',
            animation: 'fadeIn 0.5s ease-in-out',
            position: 'relative'
          }}>
            <style>
              {`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}
            </style>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.5rem' }}>🎉</span>
              <div>
                <h3 style={{ color: '#00ff88', margin: '0 0 5px 0', fontSize: '1.1rem' }}>
                  Content Successfully Uploaded!
                </h3>
                <p style={{ color: '#cccccc', margin: '0', fontSize: '0.9rem' }}>
                  "{uploadedLectureInfo.title}" has been added to the {uploadedLectureInfo.category} category.
                  The content should now appear in the lecture list below.
                </p>
              </div>
              <button
                onClick={() => { setJustUploaded(false); setUploadedLectureInfo(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '0',
                  marginLeft: 'auto'
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}

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
                  .map((lecture, index) => {
                    // Enhanced content validation for logging
                    const contentId = lecture.contentId;
                    const contentInfo = {
                      hasContentId: !!contentId,
                      contentIdType: typeof contentId,
                      filename: typeof contentId === 'string' ? contentId :
                               (typeof contentId === 'object' ? contentId?.filename : 'N/A'),
                      isValid: contentId && (typeof contentId === 'string' ||
                              (typeof contentId === 'object' && contentId?.filename))
                    };

                    console.log(`📖 Lecture ${index + 1}: "${lecture.title}"`, contentInfo);

                    return (
                      <div
                        key={lecture._id || `lecture-${index}`}
                        className="lecture-card"
                        onClick={() => handleLectureClick(lecture)}
                        style={
                          !lecture.contentId ||
                          (typeof lecture.contentId !== 'string' &&
                           !(lecture.contentId && lecture.contentId.filename)) ? {
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

                        {(!lecture.contentId ||
                          (typeof lecture.contentId !== 'string' &&
                           !(lecture.contentId && lecture.contentId.filename))) && (
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
                          disabled={!lecture.contentId ||
                                   (typeof lecture.contentId !== 'string' &&
                                    !(lecture.contentId && lecture.contentId.filename))}
                        >
                          {(lecture.contentId &&
                            (typeof lecture.contentId === 'string' ||
                             (typeof lecture.contentId === 'object' && lecture.contentId.filename)))
                            ? 'View Lecture' : 'Content Missing'}
                        </button>
                      </div>
                    );
                  })}
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
