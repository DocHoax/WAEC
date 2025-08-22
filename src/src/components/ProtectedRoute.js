import React, { useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useContext(AuthContext);
  const [isReady, setIsReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      setIsReady(true);
    }
  }, [loading]);

  console.log('ProtectedRoute - user:', user, 'requiredRole:', requiredRole, 'loading:', loading, 'isReady:', isReady, 'path:', location.pathname);

  if (loading || !isReady) {
    return (
      <p style={{ padding: '20px', color: '#FFFFFF', backgroundColor: '#4B5320', textAlign: 'center', fontFamily: 'sans-serif', fontSize: '16px' }}>
        Loading...
      </p>
    );
  }

  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    if (Array.isArray(requiredRole)) {
      if (!requiredRole.includes(user.role)) {
        console.log(`ProtectedRoute - Role mismatch (user: ${user.role}, required: ${requiredRole.join(', ')}), redirecting to /unauthorized`);
        return <Navigate to="/unauthorized" replace />;
      }
    } else if (user.role !== requiredRole) {
      console.log(`ProtectedRoute - Role mismatch (user: ${user.role}, required: ${requiredRole}), redirecting to /unauthorized`);
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;