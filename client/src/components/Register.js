import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const result = await register(name, email, password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleGoogleClick = (e) => {
    e.preventDefault();
    window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/google`;
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
          
          .register-container {
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
          
          .register-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, transparent, rgba(0, 255, 136, 0.05), transparent);
            z-index: 0;
          }
          
          .register-header {
            text-align: center;
            margin-bottom: 30px;
            position: relative;
            z-index: 1;
          }
          
          .register-title {
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
          
          .register-subtitle {
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
          
          .register-button {
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
          
          .register-button:hover {
            background: #00cc6d;
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
            transform: translateY(-2px);
          }
          
          .register-button:disabled {
            background: #2a4060;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
          
          .register-link {
            text-align: center;
            margin-top: 20px;
            font-family: 'Roboto', sans-serif;
            position: relative;
            z-index: 1;
          }
          
          .register-link a {
            color: #00aaff;
            text-decoration: none;
            transition: all 0.3s ease;
          }
          
          .register-link a:hover {
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
            background: #4285f4;
            color: white;
            border: none;
            border-radius: 4px;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            z-index: 1;
          }

          .google-button:hover {
            background: #3367d6;
            box-shadow: 0 0 15px rgba(66, 133, 244, 0.6);
            transform: translateY(-2px);
          }
        `}
      </style>
      
      <div className="register-container">
        <div className="register-header">
          <h1 className="register-title">Access <span style={{color: '#00ff88'}}>Control</span></h1>
          <div className="register-subtitle">Create Your Account</div>
        </div>
        
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
          
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            className="register-button"
            disabled={loading}
            style={{ marginBottom: '15px' }}
          >
            {loading ? (
              <span>
                <span className="loading-spinner"></span> Creating Account...
              </span>
            ) : (
              'Sign Up'
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

          <button
            type="button"
            onClick={handleGoogleClick}
            className="google-button"
          >
            Continue with Google
          </button>
        </form>

        <div className="register-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
