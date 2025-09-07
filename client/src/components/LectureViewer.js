import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LectureViewer = () => {
  const { filename } = useParams();
  const navigate = useNavigate();
  const { user, updateProgress, getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lectureContent, setLectureContent] = useState('');
  const [completed, setCompleted] = useState(false);
  const animationFrameRef = useRef(null);
  const intervalsRef = useRef([]);
  const timeoutsRef = useRef([]);
  const eventListenersRef = useRef([]);

  useEffect(() => {
    loadLecture();
    
    // Cleanup function to stop any running scripts when component unmounts
    return () => {
      cleanupScripts();
    };
  }, [filename]);

  useEffect(() => {
    // Check if this lecture is already marked as completed
    if (user && user.lectureProgress) {
      const progress = user.lectureProgress.find(
        item => item.lectureName === filename
      );
      if (progress) {
        setCompleted(progress.completed);
      }
    }
  }, [user, filename]);

  const cleanupScripts = () => {
    // Cancel any animation frames
    if (animationFrameRef.current) {
      try {
        cancelAnimationFrame(animationFrameRef.current);
      } catch (error) {
        console.warn('Error canceling animation frame:', error);
      }
    }
    
    // Clear all timeouts
    timeoutsRef.current.forEach(timeoutId => {
      if (timeoutId) {
        try {
          clearTimeout(timeoutId);
        } catch (error) {
          console.warn('Error clearing timeout:', error);
        }
      }
    });
    
    // Clear all intervals
    intervalsRef.current.forEach(intervalId => {
      if (intervalId) {
        try {
          clearInterval(intervalId);
        } catch (error) {
          console.warn('Error clearing interval:', error);
        }
      }
    });
    
    // Remove event listeners
    eventListenersRef.current.forEach(({ element, event, handler }) => {
      if (element && event && handler) {
        try {
          element.removeEventListener(event, handler);
        } catch (error) {
          console.warn('Error removing event listener:', error);
        }
      }
    });
    
    // Call the cleanup function we defined in the lecture script if it exists
    if (window.cleanupLectureScript) {
      try {
        window.cleanupLectureScript();
      } catch (error) {
        console.warn('Error cleaning up lecture script:', error);
      }
      // Remove the cleanup function from window object
      try {
        delete window.cleanupLectureScript;
      } catch (error) {
        console.warn('Error removing cleanup function:', error);
      }
    }
    
    // Clear refs
    animationFrameRef.current = null;
    intervalsRef.current = [];
    timeoutsRef.current = [];
    eventListenersRef.current = [];
    
    // Additional cleanup: Clear any remaining window properties that might have been added by lecture scripts
    try {
      // Clear any timeouts/intervals that might have been stored directly on window
      if (window.timeoutsRef) {
        window.timeoutsRef.forEach(timeoutId => {
          if (timeoutId) {
            try {
              clearTimeout(timeoutId);
            } catch (error) {
              console.warn('Error clearing timeout from window ref:', error);
            }
          }
        });
      }
      
      if (window.intervalsRef) {
        window.intervalsRef.forEach(intervalId => {
          if (intervalId) {
            try {
              clearInterval(intervalId);
            } catch (error) {
              console.warn('Error clearing interval from window ref:', error);
            }
          }
        });
      }
    } catch (error) {
      console.warn('Error during additional cleanup:', error);
    }
  };

  const loadLecture = async () => {
    try {
      setLoading(true);
      setError('');

      // Get fresh authentication headers
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Debug: Log file request
      console.log(`🔍 Loading lecture: ${filename}`);

      // Fetch the lecture content from database with auth headers
      const response = await fetch(`/api/content/lecture-content/${filename}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 Request status: ${response.status}`);
      console.log(`📡 Response URL: ${response.url}`);

      if (!response.ok) {
        let errorMessage = `Failed to load lecture: ${response.status}`;

        if (response.status === 403) {
          errorMessage = 'Subscription required to access this lecture. Please subscribe to continue.';
        } else if (response.status === 404) {
          errorMessage = `Lecture "${filename}" not found in database.`;
        } else if (response.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else {
          // Log detailed error
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('API Error Response:', errorText);
        }

        throw new Error(errorMessage);
      }

      const content = await response.text();
      console.log(`✅ Lecture content loaded: ${content.length} characters`);

      if (content.length === 0) {
        throw new Error('Lecture content is empty.');
      }

      setLectureContent(content);
    } catch (err) {
      console.error('❌ Error loading lecture:', err);

      // Provide more detailed error messages
      let userFriendlyMessage = err.message;
      if (err.message.includes('Failed to fetch')) {
        userFriendlyMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (err.message.includes('NetworkError')) {
        userFriendlyMessage = 'Network error. Please try again.';
      }

      setError(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // Function to execute scripts in HTML content and expose functions globally
  const executeScripts = () => {
    const contentDiv = document.querySelector('.lecture-content');
    if (contentDiv) {
      const scripts = contentDiv.querySelectorAll('script');
      
      // Process scripts sequentially to handle dependencies
      const processScript = (index) => {
        if (index >= scripts.length) {
          // All scripts processed, now trigger DOMContentLoaded event
          // to ensure any code that depends on this event runs
          if (document.createEvent) {
            const event = document.createEvent('HTMLEvents');
            event.initEvent('DOMContentLoaded', true, true);
            document.dispatchEvent(event);
          }
          
          // Also trigger a custom event to indicate content is ready
          if (document.createEvent) {
            const event = document.createEvent('HTMLEvents');
            event.initEvent('contentReady', true, true);
            document.dispatchEvent(event);
          }
          return;
        }
        
        const script = scripts[index];
        const newScript = document.createElement('script');
        
        // Handle external scripts (with src attribute)
        if (script.src) {
          newScript.src = script.src;
          newScript.onload = () => processScript(index + 1);
          newScript.onerror = () => processScript(index + 1);
        } else {
          // Handle inline scripts - execute them directly in the global scope
          // but with error handling to prevent one script from breaking others
          const originalCode = script.textContent;
          // Escape any </script> tags in the code to prevent breaking the script tag
          const escapedCode = originalCode.replace(/<\/script>/g, '<\\/script>');
          
          // Create the wrapped code without using template literals to avoid syntax conflicts
          const wrappedCode = 
            "try {" +
            escapedCode +
            "} catch (error) {" +
            "console.warn('Error executing lecture script:', error);" +
            "}";
          
          newScript.textContent = wrappedCode;
          script.parentNode.replaceChild(newScript, script);
          processScript(index + 1);
        }
        
        if (script.src) {
          script.parentNode.replaceChild(newScript, script);
        }
      };
      
      processScript(0);
    }
  };

  // Execute scripts after content is rendered
  useEffect(() => {
    if (!loading && lectureContent) {
      // Wait for the DOM to be fully rendered and key elements to be available
      const checkAndExecute = () => {
        const contentDiv = document.querySelector('.lecture-content');
        if (contentDiv && contentDiv.children.length > 0) {
          // Add a small delay to ensure all elements are rendered
          setTimeout(() => {
            // Set up tracking arrays in window object
            window.timeoutsRef = timeoutsRef.current;
            window.intervalsRef = intervalsRef.current;
            window.animationFramesRef = [];
            window.eventListenersRef = eventListenersRef.current;
            
            executeScripts();
          }, 300);
        } else {
          // If content isn't ready yet, wait a bit more
          setTimeout(checkAndExecute, 100);
        }
      };
      
      setTimeout(checkAndExecute, 150);
    }
    
    // Cleanup when component unmounts or when loading/lectureContent changes
    return () => {
      cleanupScripts();
    };
  }, [loading, lectureContent]);

  const handleCompletionToggle = async (event) => {
    const newCompleted = event.target.checked;
    setCompleted(newCompleted);
    
    try {
      await updateProgress(filename, newCompleted);
    } catch (err) {
      console.error('Error updating progress:', err);
      setError('Failed to update progress. Please try again.');
      // Revert the checkbox state on error
      setCompleted(!newCompleted);
    }
  };

  const getDisplayName = () => {
    if (!filename) return 'Lecture';
    
    return filename
      .replace('.html', '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
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
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;900&family=Roboto:wght@300;400;50500;700&display=swap');
            
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
          
          .lecture-content {
            padding: 20px;
            max-width: 100%;
            overflow-x: auto;
          }
          
          .error-message {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid #ff0000;
            border-radius: 8px;
            padding: 20px;
            color: #ff8888;
            margin: 20px;
            text-align: center;
            font-family: 'Roboto', sans-serif;
          }
          
          /* Preserve lecture styles */
          .lecture-content h1, .lecture-content h2, .lecture-content h3 {
            color: #00ff88;
            font-family: 'Orbitron', sans-serif;
          }
          
          .lecture-content p {
            color: #e0e0e0;
            font-family: 'Roboto', sans-serif;
            line-height: 1.7;
          }
          
          .lecture-content a {
            color: #00aaff;
          }
          
          .lecture-content a:hover {
            color: #00ff88;
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
        
        <h1 className="lecture-title">{getDisplayName()}</h1>
        
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
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      <div className="lecture-content">
        {lectureContent ? (
          <div 
            dangerouslySetInnerHTML={{ __html: lectureContent }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '50px', color: '#aaaaaa' }}>
            No content available for this lecture.
          </div>
        )}
      </div>
    </div>
  );
};

export default LectureViewer;
