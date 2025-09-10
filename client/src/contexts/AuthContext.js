import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// Set axios default base URL from environment variables
axios.defaults.baseURL = `${process.env.REACT_APP_API_URL || 'http://localhost:5002'}/api`;

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Set up axios defaults and check for token in URL
  useEffect(() => {
    // Check for token in URL parameters (for Google OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (urlToken) {
      // Store token and clean URL
      localStorage.setItem('token', urlToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${urlToken}`;
      window.history.replaceState({}, document.title, window.location.pathname);
      loadUser(urlToken);
    } else {
      // Check for token in localStorage
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        loadUser(token);
      } else {
        setLoading(false);
      }
    }
  }, []);

  // Load user data
  const loadUser = async (token) => {
    try {
      const res = await axios.get('/api/auth/profile');
      setUser(res.data);
      setIsSubscribed(res.data.isSubscribed);
    } catch (err) {
      console.error('Error loading user:', err);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const register = async (name, email, password) => {
    try {
      const res = await axios.post('/api/auth/register', { name, email, password });
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setUser(res.data);
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Registration failed' 
      };
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setUser(res.data);
      setIsSubscribed(res.data.isSubscribed);
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Login failed' 
      };
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setIsSubscribed(false);
  };

  // Update subscription status
  const updateSubscriptionStatus = (status) => {
    setIsSubscribed(status);
    if (user) {
      setUser({ ...user, isSubscribed: status });
    }
  };

  // Update lecture progress
  const updateProgress = async (lectureName, completed) => {
    try {
      const res = await axios.put('/api/auth/progress', { lectureName, completed });
      if (user) {
        setUser({ ...user, lectureProgress: res.data });
      }
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to update progress' 
      };
    }
  };

  // Get auth headers for fetch requests
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (token) {
      // Check if token is expired (simple check for demo)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        if (payload.exp && payload.exp < currentTime) {
          console.warn('🔑 Token expired, removing from localStorage');
          localStorage.removeItem('token');
          setUser(null);
          setIsSubscribed(false);
          return {};
        }
      } catch (e) {
        console.warn('Error parsing token:', e.message);
        localStorage.removeItem('token');
        setUser(null);
        setIsSubscribed(false);
        return {};
      }
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  // Validate current authentication
  const validateAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      return false;
    }

    try {
      const response = await axios.get('/api/auth/profile');
      return response.status === 200;
    } catch (error) {
      console.log('Authentication validation failed:', error.message);
      // Clear invalid auth
      localStorage.removeItem('token');
      logout();
      return false;
    }
  };

  const value = {
    user,
    loading,
    isSubscribed,
    register,
    login,
    logout,
    updateSubscriptionStatus,
    updateProgress,
    getAuthHeaders,
    validateAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
