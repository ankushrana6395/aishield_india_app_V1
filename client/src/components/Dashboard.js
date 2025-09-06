import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const [fileLectures, setFileLectures] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isSubscribed } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, [isSubscribed]);

  const loadDashboardData = async () => {
    if (!isSubscribed) {
      setLoading(false);
      return;
    }

    try {
      // Load categories
      const categoryRes = await axios.get('/api/content/categories');
      setCategories(categoryRes.data);
      
      // Load all lectures by default
      await loadAllLectures();
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllLectures = async () => {
    try {
      // Load file-based lectures
      const fileRes = await axios.get('/api/content/lectures');
      setFileLectures(fileRes.data);
    } catch (err) {
      setError('Failed to load lectures');
      console.error('Error loading lectures:', err);
    }
  };

  const loadLecturesByCategory = async (categoryId) => {
    try {
      // Load file-based lectures for the selected category
      const fileRes = await axios.get(`/api/content/lectures/category/${categoryId}`);
      setFileLectures(fileRes.data);
    } catch (err) {
      setError('Failed to load lectures');
      console.error('Error loading lectures:', err);
    }
  };

  const handleViewFileLecture = (filename) => {
    navigate(`/lecture/${filename}`);
  };

  const calculateProgress = () => {
    const totalLectures = fileLectures.length;
    if (!user || !user.lectureProgress || totalLectures === 0) return 0;
    
    const completedCount = user.lectureProgress.filter(
      item => item.completed
    ).length;
    
    return Math.round((completedCount / totalLectures) * 100);
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
          <div className="loading-text">Loading Dashboard...</div>
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
          
          .dashboard-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          
          .dashboard-header {
            margin-bottom: 30px;
            text-align: center;
          }
          
          .dashboard-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 2.5rem;
            color: white;
            margin-bottom: 10px;
            text-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
          }
          
          .user-greeting {
            font-family: 'Roboto', sans-serif;
            font-size: 1.3rem;
            color: #00aaff;
            margin-bottom: 20px;
          }
          
          .alert-box {
            background: rgba(255, 136, 0, 0.1);
            border: 1px solid #ff8800;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
            font-family: 'Roboto', sans-serif;
          }
          
          .alert-box.success {
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid #00ff88;
          }
          
          .alert-title {
            font-family: 'Orbitron', sans-serif;
            color: #ff8800;
            margin-bottom: 10px;
            font-size: 1.3rem;
          }
          
          .alert-box.success .alert-title {
            color: #00ff88;
          }
          
          .subscribe-button {
            background: #00ff88;
            color: #0a1121;
            border: none;
            border-radius: 4px;
            padding: 12px 24px;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 15px;
          }
          
          .subscribe-button:hover {
            background: #00cc6d;
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
            transform: translateY(-2px);
          }
          
          .progress-container {
            background: #111c30;
            border: 1px solid #2a4060;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
          }
          
          .progress-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-family: 'Orbitron', sans-serif;
            color: #00ff88;
          }
          
          .progress-bar-container {
            height: 20px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            overflow: hidden;
          }
          
          .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #00ff88, #00aaff);
            border-radius: 10px;
            transition: width 0.5s ease;
          }
          
          .section-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 2rem;
            color: #00ff88;
            margin: 30px 0 20px;
            text-align: center;
          }
          
          .section-subtitle {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.5rem;
            color: #00aaff;
            margin: 20px 0 15px;
            text-align: center;
          }
          
          .lectures-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 25px;
            margin-top: 20px;
          }
          
          .lecture-card {
            background: #111c30;
            border: 1px solid #2a4060;
            border-radius: 16px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            transition: all 0.4s ease;
            position: relative;
            overflow: hidden;
            cursor: pointer;
          }
          
          .lecture-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, transparent, rgba(0, 255, 136, 0.05), transparent);
            z-index: 0;
          }
          
          .lecture-card:hover {
            transform: translateY(-10px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 136, 0.3);
            border-color: #00ff88;
          }
          
          .lecture-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.4rem;
            color: #00ff88;
            margin-bottom: 15px;
            position: relative;
            z-index: 1;
          }
          
          .lecture-tag {
            display: inline-block;
            background: rgba(0, 255, 136, 0.15);
            color: #00ff88;
            padding: 5px 12px;
            border-radius: 20px;
            font-family: 'Roboto', sans-serif;
            font-size: 0.9rem;
            margin-bottom: 20px;
            position: relative;
            z-index: 1;
          }
          
          .view-button {
            background: #00aaff;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 20px;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            z-index: 1;
          }
          .view-button:hover {
            background: #0088cc;
            box-shadow: 0 0 15px rgba(0, 170, 255, 0.6);
            transform: translateY(-2px);
          }
          
          .lock-icon {
            font-size: 4rem;
            color: #2a4060;
            margin: 30px 0;
            text-align: center;
          }
          
          .unlock-message {
            text-align: center;
            font-family: 'Roboto', sans-serif;
            font-size: 1.3rem;
            color: #aaaaaa;
            margin: 20px 0;
          }
          
          .error-message {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid #ff0000;
            border-radius: 8px;
            padding: 15px;
            color: #ff8888;
            margin: 20px 0;
            text-align: center;
            font-family: 'Roboto', sans-serif;
          }
        `}
      </style>
      
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">AIShield <span style={{color: '#00ff88'}}>India</span></h1>
          <div className="user-greeting">Welcome, {user?.name}!</div>
        </div>
        
        {!isSubscribed ? (
          <div className="alert-box">
            <h2 className="alert-title">Subscription Required</h2>
            <p>You need an active subscription to access course content.</p>
            <button 
              className="subscribe-button"
              onClick={() => navigate('/payment')}
            >
              Subscribe Now
            </button>
          </div>
        ) : (
          <div className="alert-box success">
            <h2 className="alert-title">Active Subscription</h2>
            <p>You have an active subscription. Enjoy learning!</p>
          </div>
        )}
        
        {isSubscribed && (fileLectures.length > 0) && (
          <div className="progress-container">
            <div className="progress-header">
              <span>Your Progress</span>
              <span>{calculateProgress()}% Complete</span>
            </div>
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {isSubscribed && categories.length > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '30px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <button
              onClick={async () => {
                setSelectedCategory(null);
                await loadAllLectures();
              }}
              style={{
                background: selectedCategory === null 
                  ? '#00ff88' 
                  : '#111c30',
                color: selectedCategory === null 
                  ? '#0a1121' 
                  : '#e0e0e0',
                border: '1px solid #2a4060',
                borderRadius: '20px',
                padding: '10px 20px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                if (selectedCategory !== null) {
                  e.target.style.background = '#00aaff';
                  e.target.style.borderColor = '#00aaff';
                }
              }}
              onMouseOut={(e) => {
                if (selectedCategory !== null) {
                  e.target.style.background = '#111c30';
                  e.target.style.borderColor = '#2a4060';
                }
              }}
            >
              All Lectures
            </button>
            {categories.map((category) => (
              <button
                key={category._id}
                onClick={async () => {
                  setSelectedCategory(category);
                  await loadLecturesByCategory(category._id);
                }}
                style={{
                  background: selectedCategory && selectedCategory._id === category._id 
                    ? '#00ff88' 
                    : '#111c30',
                  color: selectedCategory && selectedCategory._id === category._id 
                    ? '#0a1121' 
                    : '#e0e0e0',
                  border: '1px solid #2a4060',
                  borderRadius: '20px',
                  padding: '10px 20px',
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseOver={(e) => {
                  if (!(selectedCategory && selectedCategory._id === category._id)) {
                    e.target.style.background = '#00aaff';
                    e.target.style.borderColor = '#00aaff';
                  }
                }}
                onMouseOut={(e) => {
                  if (!(selectedCategory && selectedCategory._id === category._id)) {
                    e.target.style.background = '#111c30';
                    e.target.style.borderColor = '#2a4060';
                  }
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
        
        <h2 className="section-title">
          {isSubscribed ? 'Available Lectures' : 'Course Overview'}
        </h2>
        
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        {!isSubscribed ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <div className="lock-icon">🔒</div>
            <div className="unlock-message">
              Subscribe to unlock all lectures
            </div>
            <button 
              className="subscribe-button"
              onClick={() => navigate('/payment')}
            >
              Get Full Access
            </button>
          </div>
        ) : (fileLectures.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <div className="unlock-message">
              No lectures available at the moment
            </div>
          </div>
        ) : (
          <div>
            <h3 className="section-subtitle">
              {selectedCategory ? selectedCategory.name : 'All Lectures'}
            </h3>
            <div className="lectures-grid">
              {fileLectures.map((lecture) => (
                <div 
                  className="lecture-card"
                  key={lecture.fileName}
                  onClick={() => handleViewFileLecture(lecture.fileName)}
                >
                  <h3 className="lecture-title">{lecture.displayName}</h3>
                  {lecture.description && (
                    <p style={{ 
                      color: '#aaaaaa', 
                      fontFamily: 'Roboto, sans-serif',
                      fontSize: '0.9rem',
                      marginBottom: '15px'
                    }}>
                      {lecture.description}
                    </p>
                  )}
                  <div className="lecture-tag">
                    {lecture.category && lecture.category.name ? lecture.category.name : 'Lecture'}
                  </div>
                  <button className="view-button">
                    View Lecture
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
