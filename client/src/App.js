import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/lecture/:filename" element={<ProtectedRoute><LectureViewer /></ProtectedRoute>} />
        <Route path="/lecture/database/:slug" element={<ProtectedRoute><LectureViewerNew /></ProtectedRoute>} />
        <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
