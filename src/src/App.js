import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import TeacherHome from './pages/TeacherHome';
import StudentHome from './pages/StudentHome';
import AdminHome from './pages/AdminHome';
import Register from './pages/Register';
import TestTaking from './pages/TestTaking';
import TestResults from './pages/TestResults';
import Results from './pages/Results';
import EditResults from './pages/EditResults';
import Analytics from './components/teacher/Analytics';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import AdminLayout from './components/AdminLayout';
import ManageClasses from './pages/ManageClasses';
import ManageUsers from './pages/ManageUsers';
import SessionSchedules from './pages/SessionSchedules';
import DataExports from './pages/DataExports';
import ManageTests from './pages/ManageTests';
import TestDetails from './pages/TestDetails';
import Dashboard from './pages/Dashboard';
import Tests from './pages/Tests';
import Profile from './pages/Profile';
import Submitted from './pages/Submitted';
import SetBatch from './pages/SetBatch';

// Simple components that don't use AuthContext
const RootRedirect = () => {
  return <Navigate to="/login" replace />;
};

class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          textAlign: 'center',
          color: '#4B5320',
          fontFamily: 'sans-serif',
          padding: '20px',
          backgroundColor: '#F8F9FA',
          minHeight: '100vh'
        }}>
          <h1>Something went wrong. Please try again.</h1>
        </div>
      );
    }
    return this.props.children;
  }
}

// Create a wrapper component that uses AuthContext INSIDE AuthProvider
const AppContent = () => {
  return (
    <Router>
      <Routes>
        {/* Simple redirect - will be handled by ProtectedRoute logic */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        
        {/* Student routes */}
        <Route
          path="/student"
          element={<ProtectedRoute requiredRole="student"><StudentHome><Dashboard /></StudentHome></ProtectedRoute>}
        />
        <Route
          path="/student/dashboard"
          element={<ProtectedRoute requiredRole="student"><StudentHome><Dashboard /></StudentHome></ProtectedRoute>}
        />
        <Route
          path="/student/tests"
          element={<ProtectedRoute requiredRole="student"><StudentHome><Tests /></StudentHome></ProtectedRoute>}
        />
        <Route
          path="/student/profile"
          element={<ProtectedRoute requiredRole="student"><StudentHome><Profile /></StudentHome></ProtectedRoute>}
        />
        <Route
          path="/student/submitted"
          element={<ProtectedRoute requiredRole="student"><Submitted /></ProtectedRoute>}
        />
        <Route
          path="/student/results"
          element={<ProtectedRoute requiredRole="student"><TestResults /></ProtectedRoute>}
        />
        <Route
          path="/student/test/:testId"
          element={<ProtectedRoute requiredRole="student"><TestTaking /></ProtectedRoute>}
        />
        
        {/* Teacher routes */}
        <Route
          path="/teacher/*"
          element={<ProtectedRoute requiredRole="teacher"><TeacherHome /></ProtectedRoute>}
        />
        
        {/* Admin routes - updated to include both admin and super_admin */}
        <Route
          path="/admin"
          element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><AdminLayout><AdminHome /></AdminLayout></ProtectedRoute>}
        />
        <Route
          path="/admin/classes"
          element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><AdminLayout><ManageClasses /></AdminLayout></ProtectedRoute>}
        />
        <Route
          path="/admin/users"
          element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><AdminLayout><ManageUsers /></AdminLayout></ProtectedRoute>}
        />
        <Route
          path="/admin/tests"
          element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><AdminLayout><ManageTests /></AdminLayout></ProtectedRoute>}
        />
        <Route
          path="/admin/tests/:testId"
          element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><AdminLayout><TestDetails /></AdminLayout></ProtectedRoute>}
        />
        <Route
          path="/admin/tests/:testId/batch"
          element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><AdminLayout><SetBatch /></AdminLayout></ProtectedRoute>}
        />
        <Route
          path="/admin/results"
          element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><AdminLayout><EditResults /></AdminLayout></ProtectedRoute>}
        />
        <Route
          path="/admin/results/:testId"
          element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><AdminLayout><Results /></AdminLayout></ProtectedRoute>}
        />
        <Route
          path="/admin/sessions"
          element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><AdminLayout><SessionSchedules /></AdminLayout></ProtectedRoute>}
        />
        <Route
          path="/admin/exports"
          element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><AdminLayout><DataExports /></AdminLayout></ProtectedRoute>}
        />
        <Route
          path="/admin/analytics"
          element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><AdminLayout><Analytics /></AdminLayout></ProtectedRoute>}
        />
        
        {/* Other routes */}
        <Route
          path="/users"
          element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><Register /></ProtectedRoute>}
        />
        <Route
          path="/analytics"
          element={<ProtectedRoute requiredRoles={['teacher', 'admin', 'super_admin']}><Analytics /></ProtectedRoute>}
        />
        <Route
          path="/unauthorized"
          element={
            <div style={{
              textAlign: 'center',
              color: '#4B5320',
              fontFamily: 'sans-serif',
              padding: '20px',
              backgroundColor: '#F8F9FA',
              minHeight: '100vh'
            }}>
              Unauthorized: Access Denied
            </div>
          }
        />
        <Route
          path="*"
          element={
            <div style={{
              textAlign: 'center',
              color: '#4B5320',
              fontFamily: 'sans-serif',
              padding: '20px',
              backgroundColor: '#F8F9FA',
              minHeight: '100vh'
            }}>
              404: Route not found
            </div>
          }
        />
      </Routes>
    </Router>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;