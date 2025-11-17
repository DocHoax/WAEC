import React, { useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole, requiredRoles }) => {
  const { user, loading } = useContext(AuthContext);
  const [isReady, setIsReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      setIsReady(true);
    }
  }, [loading]);

  console.log('ProtectedRoute - user:', user, 'requiredRole:', requiredRole, 'requiredRoles:', requiredRoles, 'loading:', loading, 'isReady:', isReady, 'path:', location.pathname);

  if (loading || !isReady) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          borderRadius: '12px',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #4B5320',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ 
            margin: 0, 
            color: '#4B5320', 
            fontSize: '16px',
            fontWeight: '500'
          }}>
            Loading...
          </p>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role access
  if (requiredRole || requiredRoles) {
    const rolesToCheck = requiredRoles || [requiredRole];
    const userRoles = [user.role];
    
    // Super admin has access to everything
    if (user.role === 'super_admin') {
      console.log('ProtectedRoute - Super admin access granted');
      return children;
    }

    // Check if user has any of the required roles
    const hasAccess = rolesToCheck.some(role => userRoles.includes(role));
    
    if (!hasAccess) {
      console.log(`ProtectedRoute - Role mismatch (user: ${user.role}, required: ${rolesToCheck.join(', ')}), redirecting to /unauthorized`);
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;