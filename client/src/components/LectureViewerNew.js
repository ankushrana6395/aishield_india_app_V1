import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LectureTemplate from './LectureTemplate';

const LectureViewerNew = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, updateProgress } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lecture, setLecture] = useState(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadLecture();
  }, [slug]);

  useEffect(() => {
    // Check if this lecture is already marked as completed
    if (user && user.lectureProgress) {
      const progress = user.lectureProgress.find(
        item => item.lectureName === slug
      );
      if (progress) {
        setCompleted(progress.completed);
      }
    }
  }, [user, slug]);

  const loadLecture = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch the lecture from the new API endpoint
      const response = await fetch(`/api/content/lectures/database/${slug}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load lecture: ${response.status}`);
      }
      
      const data = await response.json();
      setLecture(data);
    } catch (err) {
      console.error('Error loading lecture:', err);
      setError('Failed to load lecture content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompletionToggle = async (event) => {
    const newCompleted = event.target.checked;
    setCompleted(newCompleted);
    
    try {
      await updateProgress(slug, newCompleted);
    } catch (err) {
      console.error('Error updating progress:', err);
      setError('Failed to update progress. Please try again.');
      // Revert the checkbox state on error
      setCompleted(!newCompleted);
    }
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
          <div className="loading-text">Loading Lecture...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a1121',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <div className="error-message" style={{
          background: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid #ff0000',
          borderRadius: '8px',
          padding: '20px',
          color: '#ff8888',
          textAlign: 'center',
          fontFamily: "'Roboto', sans-serif"
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a1121',
      color: '#e0e0e0',
      fontFamily: "'Roboto', sans-serif"
    }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;900&family=Roboto:wght@300;400;500;700&display=swap');
          
          .lecture-header {
            background: #111c30;
            border-bottom: 1px solid #2a4060;
            padding: 15px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
          }
          
          .back-button {
            background: #00aaff;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 20px;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .back-button:hover {
            background: #0088cc;
            box-shadow: 0 0 15px rgba(0, 170, 255, 0.6);
            transform: translateY(-2px);
          }
          
          .lecture-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.5rem;
            color: #00ff88;
            margin: 0;
            flex-grow: 1;
            text-align: center;
          }
          
          .completion-container {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .completion-label {
            font-family: 'Roboto', sans-serif;
            color: #aaaaaa;
          }
          
          .completion-checkbox {
            width: 20px;
            height: 20px;
            accent-color: #00ff88;
            cursor: pointer;
          }
          
          .lecture-content-container {
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
          }
        `}
      </style>
      
      <div className="lecture-header">
        <button 
          className="back-button"
          onClick={() => navigate('/')}
        >
          ← Back to Dashboard
        </button>
        
        <h1 className="lecture-title">
          {lecture ? lecture.title : 'Lecture'}
        </h1>
        
        <div className="completion-container">
          <span className="completion-label">Mark as completed:</span>
          <input
            type="checkbox"
            className="completion-checkbox"
            checked={completed}
            onChange={handleCompletionToggle}
          />
        </div>
      </div>
      
      <div className="lecture-content-container">
        {lecture ? (
          <LectureTemplate lectureData={lecture} />
        ) : (
          <div style={{ textAlign: 'center', padding: '50px', color: '#aaaaaa' }}>
            No content available for this lecture.
          </div>
        )}
      </div>
    </div>
  );
};

export default LectureViewerNew;
