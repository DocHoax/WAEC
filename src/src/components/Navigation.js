import React from 'react';
import { useAuth } from '../context/AuthContext';

const Navigation = () => {
  const { user, hasPermission } = useAuth();

  if (!user) return null;

  return (
    <nav style={styles.nav}>
      {/* Home link - always visible */}
      <a href="/" style={styles.navLink}>Home</a>

      {/* Dashboard link - for authenticated users */}
      {user && (
        <a href="/dashboard" style={styles.navLink}>Dashboard</a>
      )}

      {/* Admin links - only for users with admin permissions */}
      {hasPermission('access_admin') && (
        <a href="/admin" style={styles.navLink}>Admin Panel</a>
      )}

      {/* User management - only for users with specific permissions */}
      {hasPermission('manage_users') && (
        <a href="/admin/users" style={styles.navLink}>Manage Users</a>
      )}

      {/* Promotion panel - only for users with specific permissions */}
      {hasPermission('view_promotion') && (
        <a href="/admin/promotion" style={styles.navLink}>Student Promotion</a>
      )}

      {/* Logout button - for authenticated users */}
      {user && (
        <button onClick={() => {}} style={styles.logoutButton}>
          Logout
        </button>
      )}
    </nav>
  );
};

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6'
  },
  navLink: {
    textDecoration: 'none',
    color: '#495057',
    fontWeight: '500',
    padding: '8px 12px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#e9ecef'
    }
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginLeft: 'auto'
  }
};

export default Navigation;