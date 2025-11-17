import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';

const AdminLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Updated tabs array with Promotion Panel
  const tabs = [
    { path: '/admin', label: 'Home' },
    { path: '/admin/classes', label: 'Manage Classes & Subjects' },
    { path: '/admin/users', label: 'Manage Users' },
    { path: '/admin/tests', label: 'Tests & Exams' },
    { path: '/admin/results', label: 'Results' },
    { path: '/admin/sessions', label: 'Session Schedules' },
    { path: '/admin/promotion', label: 'Student Promotion' },
    { path: '/admin/exports', label: 'Data Exports' },
    { path: '/admin/analytics', label: 'View Analytics' },
  ];

  // FIXED: Allow both admin and super_admin roles
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div style={styles.accessDenied}>
        <h2 style={styles.accessDeniedTitle}>Access Restricted</h2>
        <p style={styles.accessDeniedText}>This page is only available to administrators.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <img
              src="/uploads/sanni.png"
              alt="Sanniville Academy"
              style={styles.logo}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div>
              <h1 style={styles.headerTitle}>
                Sanniville Academy
                <span style={styles.headerSubtitle}>
                  Empowering Education Through Seamless Administration
                  {user.role === 'super_admin' && ' (Super Admin)'}
                </span>
              </h1>
            </div>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.userName}>
              Welcome, {user.name} 
              {user.role === 'super_admin' && ' (Super Admin)'}
            </span>
            <button
              onClick={() => {
                logout();
                // Force redirect to login page
                window.location.href = '/login';
              }}
              style={styles.logoutButton}
              onMouseOver={e => (e.target.style.backgroundColor = '#FFFFFF')}
              onMouseOut={e => (e.target.style.backgroundColor = '#D4A017')}
            >
              <FiLogOut style={styles.buttonIcon} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <nav style={styles.nav}>
        {tabs.map(tab => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              ...styles.navButton,
              backgroundColor: location.pathname === tab.path ? '#D4A017' : '#4B5320',
              color: location.pathname === tab.path ? '#000000' : '#FFFFFF',
            }}
            onMouseOver={e =>
              (e.target.style.backgroundColor = location.pathname === tab.path ? '#FFFFFF' : '#5A6B2A')
            }
            onMouseOut={e =>
              (e.target.style.backgroundColor = location.pathname === tab.path ? '#D4A017' : '#4B5320')
            }
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main style={styles.main}>{children}</main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © {new Date().getFullYear()} Sanniville Academy. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

// Your styles remain the same...
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#b8c2cc',
    fontFamily: '"Fredoka", sans-serif',
  },
  header: {
    backgroundColor: '#2c3e50',
    color: '#FFFFFF',
    padding: '18px 30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  logo: {
    height: '50px',
    padding: '4px',
    backgroundColor: '#FFFFFF',
    borderRadius: '6px',
    border: 'none',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '600',
    margin: 0,
  },
  headerSubtitle: {
    display: 'block',
    fontSize: '13px',
    color: '#bdc3c7',
    fontWeight: '400',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  userName: {
    fontSize: '14px',
    color: '#FFFFFF',
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#D4A017',
    color: '#000000',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.3s ease',
    fontWeight: '500',
  },
  buttonIcon: {
    fontSize: '16px',
  },
  nav: {
    maxWidth: '1400px',
    margin: '20px auto',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    padding: '12px 15px',
    backgroundColor: '#FFFFFF',
    borderRadius: '6px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    border: '1px solid #ecf0f1',
  },
  navButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontWeight: '500',
  },
  main: {
    maxWidth: '1400px',
    margin: '30px auto',
    padding: '30px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    border: '1px solid #ecf0f1',
    minHeight: 'calc(100vh - 300px)',
  },
  footer: {
    backgroundColor: '#2c3e50',
    color: '#FFFFFF',
    padding: '20px',
    marginTop: '40px',
    textAlign: 'center',
    borderTop: 'none',
  },
  footerText: {
    fontSize: '13px',
    margin: 0,
    color: '#bdc3c7',
  },
  accessDenied: {
    textAlign: 'center',
    padding: '4rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    maxWidth: '600px',
    margin: '2rem auto',
  },
  accessDeniedTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '10px',
  },
  accessDeniedText: {
    fontSize: '16px',
    color: '#555',
  },
};

export default AdminLayout;