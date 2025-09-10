import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import LectureViewer from './components/LectureViewer';
import LectureViewerNew from './components/LectureViewerNew';
import PaymentPage from './components/PaymentPage';
import AdminDashboard from './components/AdminDashboard';
import Home from './components/Home';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Profile from './components/Profile';
import SubscriptionInfo from './components/SubscriptionInfo';

// Course-related components
import CourseList from './components/courses/CourseList';
import CourseDetail from './components/courses/CourseDetail';
import CourseManagement from './components/admin/CourseManagement';
import SubscriptionPlanManagement from './components/admin/SubscriptionPlanManagement';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected User Routes */}
          <Route path="/courses" element={<ProtectedRoute><CourseList /></ProtectedRoute>} />
          <Route path="/course/:slug" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><SubscriptionInfo /></ProtectedRoute>} />

          {/* Existing lecture routes */}
          <Route path="/lecture/:filename" element={<ProtectedRoute><LectureViewer /></ProtectedRoute>} />
          <Route path="/lecture/database/:slug" element={<ProtectedRoute><LectureViewerNew /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <AdminRoute>
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/courses" element={<CourseManagement />} />
                <Route path="/subscription-plans" element={<SubscriptionPlanManagement />} />
              </Routes>
            </AdminRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
