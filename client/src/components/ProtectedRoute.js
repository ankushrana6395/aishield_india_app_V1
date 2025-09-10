import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  console.log('🛡️ ProtectedRoute: Checking authentication', {
    loading,
    userPresent: !!user,
    userName: user?.name,
    currentPath: window.location.pathname,
    userRole: user?.role || 'user'
  });

  if (loading) {
    console.log('⏳ ProtectedRoute: Loading authentication state...');
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    console.log('🚫 ProtectedRoute: No user found, redirecting to login');
    console.log('   Current path when redirecting:', window.location.pathname);
    console.log('   User state:', { user: !!user, loading });
    return <Navigate to="/login" />;
  }

  console.log('✅ ProtectedRoute: Authentication successful, rendering protected content');
  return children;
};

export default ProtectedRoute;
