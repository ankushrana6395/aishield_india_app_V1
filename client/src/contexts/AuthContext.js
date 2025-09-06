import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

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

  const value = {
    user,
    loading,
    isSubscribed,
    register,
    login,
    logout,
    updateSubscriptionStatus,
    updateProgress
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
