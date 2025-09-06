import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };


  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a1121',
      fontFamily: "'Roboto', sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#e0e0e0'
    }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;900&family=Roboto:wght@300;400;500;700&display=swap');
          
          .login-container {
            background: #111c30;
            border: 1px solid #2a4060;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 450px;
            position: relative;
            overflow: hidden;
          }
          
          .login-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, transparent, rgba(0, 255, 136, 0.05), transparent);
            z-index: 0;
          }
          
          .login-header {
            text-align: center;
            margin-bottom: 30px;
            position: relative;
            z-index: 1;
          }
          
          .login-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 2.2rem;
            color: white;
            margin-bottom: 10px;
            text-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% { text-shadow: 0 0 15px rgba(0, 255, 136, 0.6); }
            50% { text-shadow: 0 0 25px rgba(0, 255, 136, 0.9), 0 0 35px rgba(0, 255, 136, 0.5); }
            100% { text-shadow: 0 0 15px rgba(0, 255, 136, 0.6); }
          }
          
          .login-subtitle {
            font-family: 'Roboto', sans-serif;
            font-size: 1.1rem;
            color: #00aaff;
            margin: 15px 0;
          }
          
          .form-group {
            margin-bottom: 20px;
            position: relative;
            z-index: 1;
          }
          
          .form-label {
            display: block;
            margin-bottom: 8px;
            font-family: 'Orbitron', sans-serif;
            color: #00ff88;
            font-size: 0.9rem;
          }
          
          .form-input {
            width: 100%;
            padding: 12px 15px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid #2a4060;
            border-radius: 4px;
            color: white;
            font-family: 'Roboto', sans-serif;
            font-size: 1rem;
            transition: all 0.3s ease;
          }
          
          .form-input:focus {
            outline: none;
            border-color: #00ff88;
            box-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
          }
          
          .login-button {
            width: 100%;
            padding: 14px;
            background: #00ff88;
            color: #0a1121;
            border: none;
            border-radius: 4px;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
            position: relative;
            z-index: 1;
          }
          
          .login-button:hover {
            background: #00cc6d;
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
            transform: translateY(-2px);
          }
          
          .login-button:disabled {
            background: #2a4060;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
          
          .login-link {
            text-align: center;
            margin-top: 20px;
            font-family: 'Roboto', sans-serif;
            position: relative;
            z-index: 1;
          }
          
          .login-link a {
            color: #00aaff;
            text-decoration: none;
            transition: all 0.3s ease;
          }
          
          .login-link a:hover {
            color: #00ff88;
            text-shadow: 0 0 10px rgba(0, 170, 255, 0.6);
          }
          
          .error-message {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid #ff0000;
            border-radius: 6px;
            padding: 12px 15px;
            color: #ff8888;
            margin-bottom: 20px;
            font-family: 'Roboto', sans-serif;
            position: relative;
            z-index: 1;
          }
          
          .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(10, 17, 33, 0.3);
            border-radius: 50%;
            border-top-color: #0a1121;
            animation: spin 1s ease-in-out infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .google-button {
            width: 100%;
            padding: 14px;
            background: #fff;
            color: #757575;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: 'Roboto', sans-serif;
            font-weight: 500;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
          }

          .google-button:hover {
            background: #f8f8f8;
            box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.2);
            transform: translateY(-2px);
          }

          .google-button:active {
            transform: translateY(0);
          }

          .google-icon {
            width: 18px;
            height: 18px;
            margin-right: 12px;
          }

          .google-button-content {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}
      </style>
      
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">Access <span style={{color: '#00ff88'}}>Control</span></h1>
          <div className="login-subtitle">PenTest Learning Platform</div>
        </div>
        
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            className="login-button"
            disabled={loading}
            style={{ marginBottom: '15px' }}
          >
            {loading ? (
              <span>
                <span className="loading-spinner"></span> Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </button>

          <div style={{
            textAlign: 'center',
            marginBottom: '20px',
            position: 'relative',
            zIndex: 1,
            color: '#666',
            fontSize: '0.9rem'
          }}>
            OR
          </div>

          <a
            href="http://localhost:5002/api/auth/google"
            className="google-button"
            style={{ display: 'block', textDecoration: 'none' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="google-button-content">
              <svg className="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
              Sign in with Google
            </div>
          </a>
        </form>

        <div className="login-link">
          Don't have an account? <Link to="/register">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
