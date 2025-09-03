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
    { path: '/admin/promotion', label: 'Student Promotion' }, // Added promotion tab
    { path: '/admin/exports', label: 'Data Exports' },
    { path: '/admin/analytics', label: 'View Analytics' },
  ];

  if (!user || user.role !== 'admin') {
    return (
      <div style={styles.accessDenied}>
        <h2 style={styles.accessDeniedTitle}>Access Restricted</h2>
        <p style={styles.accessDeniedText}>This page is only available to admins.</p>
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
            />
            <div>
              <h1 style={styles.headerTitle}>
                Sanniville Academy
                <span style={styles.headerSubtitle}>
                  Empowering Education Through Seamless Administration
                </span>
              </h1>
            </div>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.userName}>Welcome, {user.name}</span>
            <button
              onClick={logout}
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

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: 'sans-serif',
  },
  header: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    padding: '20px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
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
    height: '60px',
    border: '3px solid #D4A017',
    padding: '5px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
  },
  headerSubtitle: {
    display: 'block',
    fontSize: '16px',
    color: '#D4A017',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  userName: {
    fontSize: '16px',
    color: '#FFFFFF',
  },
  logoutButton: {
    padding: '10px 20px',
    backgroundColor: '#D4A017',
    color: '#000000',
    border: '1px solid #000000',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'background-color 0.2s, color 0.2s',
  },
  buttonIcon: {
    fontSize: '16px',
  },
  nav: {
    maxWidth: '1400px',
    margin: '20px auto',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    padding: '15px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
  },
  navButton: {
    padding: '10px 20px',
    border: '1px solid #000000',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s, color 0.2s',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
  },
  footer: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    padding: '20px',
    marginTop: '40px',
    textAlign: 'center',
    borderTop: '1px solid #000000',
  },
  footerText: {
    fontSize: '14px',
    margin: 0,
  },
  accessDenied: {
    textAlign: 'center',
    padding: '4rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    margin: '2rem auto',
  },
  accessDeniedTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4B5320',
    marginBottom: '10px',
  },
  accessDeniedText: {
    fontSize: '16px',
    color: '#000000',
  },
};

export default AdminLayout;