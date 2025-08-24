import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import useTeacherData from '../hooks/useTeacherData';
import Dashboard from '../components/teacher/Dashboard';
import AddQuestion from '../components/teacher/AddQuestion';
import BulkImport from '../components/teacher/BulkImport';
import ManageQuestions from '../components/teacher/ManageQuestions';
import ManageTests from '../components/teacher/ManageTests';
import TestResults from '../pages/TestResults';
import Analytics from '../components/teacher/Analytics';
import TestCreation from '../pages/TestCreation';
import TestPreview from '../pages/TestPreview';
import AddTestQuestions from '../components/teacher/AddTestQuestions';
import { FiHome, FiPlusSquare, FiUpload, FiEdit, FiBook, FiBarChart, FiLogOut, FiUser } from 'react-icons/fi';

const TeacherHome = () => {
  const { user, logout } = useContext(AuthContext);
  const { loading, error: dataError, success } = useTeacherData();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || user.role !== 'teacher') {
    return (
      <div style={styles.accessDenied}>
        <p>Access Restricted: Teachers Only</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  const navItems = [
    { path: 'dashboard', icon: <FiHome />, label: 'Dashboard' },
    { path: 'test-creation', icon: <FiPlusSquare />, label: 'Create New Test' },
    { path: 'add-question', icon: <FiPlusSquare />, label: 'Add Question' },
    { path: 'bulk-import', icon: <FiUpload />, label: 'Bulk Import' },
    { path: 'questions', icon: <FiEdit />, label: 'Manage Questions' },
    { path: 'tests', icon: <FiBook />, label: 'Manage Tests' },
    { path: 'analytics', icon: <FiBarChart />, label: 'Analytics' },
  ];

  const handleNavigation = (path) => {
    console.log(`Navigating to: /teacher/${path}`);
    navigate(`/teacher/${path}`);
  };

  return (
    <div style={styles.container}>
      {dataError && (
        <div style={styles.alertError}>
          <p>Error: {dataError}</p>
        </div>
      )}
      {success && (
        <div style={styles.alertSuccess}>
          <p>{success}</p>
        </div>
      )}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <img src="/images/sanni.png" alt="Sanniville Academy" style={styles.logo} />
          <h1 style={styles.headerTitle}>Teacher Dashboard</h1>
        </div>
        <div style={styles.userSection}>
          <span style={styles.userInfo}>
            <FiUser style={styles.userIcon} /> {user.name}
          </span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={styles.logoutButton}
            onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <FiLogOut style={styles.buttonIcon} /> Logout
          </button>
        </div>
      </header>
      <div style={styles.layout}>
        <nav style={styles.sidebar}>
          <ul style={styles.navList}>
            {navItems.map(item => (
              <li key={item.path} style={styles.navItem}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  style={{
                    ...styles.navButton,
                    backgroundColor: location.pathname === `/teacher/${item.path}` ? '#D4A017' : 'transparent',
                    color: location.pathname === `/teacher/${item.path}` ? '#000000' : '#4B5320',
                    fontWeight: location.pathname === `/teacher/${item.path}` ? 'bold' : 'normal',
                    borderLeft: location.pathname === `/teacher/${item.path}` ? '4px solid #4B5320' : '4px solid transparent',
                  }}
                  onMouseOver={e => {
                    if (location.pathname !== `/teacher/${item.path}`) {
                      e.currentTarget.style.backgroundColor = '#F5F5F5';
                    }
                  }}
                  onMouseOut={e => {
                    if (location.pathname !== `/teacher/${item.path}`) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={styles.navIcon}>{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <main style={styles.main}>
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="test-creation" element={<TestCreation />} />
            <Route path="test-creation/:testId" element={<TestCreation />} />
            <Route path="test-creation/:testId/questions" element={<AddTestQuestions />} />
            <Route path="test-preview/:testId" element={<TestPreview />} />
            <Route path="add-question" element={<AddQuestion />} />
            <Route path="add-question/:testId" element={<AddQuestion />} />
            <Route path="bulk-import" element={<BulkImport />} />
            <Route path="questions" element={<ManageQuestions />} />
            <Route path="tests" element={<ManageTests />} />
            <Route path="test-results/:testId" element={<TestResults />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="/" element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'sans-serif',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    borderBottom: '1px solid #000000',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: '60px',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  logo: {
    height: '40px',
  },
  headerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  userIcon: {
    fontSize: '18px',
  },
  logoutButton: {
    backgroundColor: '#D4A017',
    color: '#000000',
    border: '1px solid #000000',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.2s',
  },
  buttonIcon: {
    fontSize: '18px',
  },
  layout: {
    display: 'flex',
    marginTop: '60px',
    minHeight: 'calc(100vh - 60px)',
  },
  sidebar: {
    width: '250px',
    backgroundColor: '#FFFFFF',
    padding: '20px 0',
    boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
    borderRight: '1px solid #E0E0E0',
    position: 'fixed',
    top: '60px',
    bottom: 0,
    overflowY: 'auto',
  },
  navList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  navItem: {
    marginBottom: '5px',
  },
  navButton: {
    width: '100%',
    textAlign: 'left',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s',
    fontSize: '16px',
  },
  navIcon: {
    fontSize: '18px',
  },
  main: {
    flex: 1,
    marginLeft: '250px',
    padding: '30px',
    backgroundColor: '#F8F9FA',
    overflowY: 'auto',
    minHeight: 'calc(100vh - 60px)',
  },
  alertError: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    borderLeft: '4px solid #B22222',
    padding: '15px',
    margin: '20px 30px',
    borderRadius: '4px',
    fontSize: '14px',
  },
  alertSuccess: {
    backgroundColor: '#d4edda',
    color: '#155724',
    borderLeft: '4px solid #28a745',
    padding: '15px',
    margin: '20px 30px',
    borderRadius: '4px',
    fontSize: '14px',
  },
  accessDenied: {
    padding: '20px',
    textAlign: 'center',
    color: '#B22222',
    backgroundColor: '#FFF3F3',
    borderRadius: '4px',
  },
};

export default TeacherHome;