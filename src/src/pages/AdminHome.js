import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const AdminHome = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]);
  const [examSchedules, setExamSchedules] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchClasses();
      fetchUsers();
      fetchTests();
      fetchResults();
      fetchExamSchedules();
    }
  }, [user]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://waec-gfv0.onrender.com/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load classes.');
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://waec-gfv0.onrender.com/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users.');
    }
    setLoading(false);
  };

  const fetchTests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://waec-gfv0.onrender.com/api/tests/admin', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTests(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tests.');
    }
    setLoading(false);
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://waec-gfv0.onrender.com/api/results', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load results.');
    }
    setLoading(false);
  };

  const fetchExamSchedules = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://waec-gfv0.onrender.com/api/exams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExamSchedules(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load exam schedules.');
    }
    setLoading(false);
  };

  const handleApproveTest = async (testId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `https://waec-gfv0.onrender.com/api/tests/${testId}/approve`,
        { status: 'approved' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTests();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve test.');
    }
    setLoading(false);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.accessDenied}>
          <p>Access Restricted: Admins Only</p>
        </div>
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

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        {error && (
          <div style={styles.alertError}>
            <FiAlertTriangle style={styles.alertIcon} />
            <span>Error: {error}</span>
          </div>
        )}

        <div style={styles.header}>
          <h2 style={styles.headerTitle}>Admin Dashboard</h2>
          <p style={styles.headerSubtitle}>
            Manage classes, tests, users, and exams at Sanniville Academy
          </p>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3 style={styles.statTitle}>Total Classes</h3>
            <p style={styles.statValue}>{classes.length}</p>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statTitle}>Total Students</h3>
            <p style={styles.statValue}>{users.filter(u => u.role === 'student').length}</p>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statTitle}>Total Tests</h3>
            <p style={styles.statValue}>{tests.length}</p>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statTitle}>Upcoming Exams</h3>
            <p style={styles.statValue}>{examSchedules.length}</p>
          </div>
        </div>

        <div style={styles.actionsGrid}>
          {[
            { title: 'User Management', desc: 'Manage teacher and student accounts', action: '/admin/users', icon: '👥' },
            { title: 'Test Management', desc: 'Review and approve teacher-created tests', action: '/admin/tests', icon: '📝' },
            { title: 'View Results', desc: 'Review student exam results', action: '/admin/results', icon: '📊' },
            { title: 'Exam Scheduling', desc: 'Plan and manage exams', action: '/admin/exams', icon: '📅' },
          ].map((item, index) => (
            <div key={index} style={styles.actionCard}>
              <span style={styles.actionIcon}>{item.icon}</span>
              <div>
                <h3 style={styles.actionTitle}>{item.title}</h3>
                <p style={styles.actionDesc}>{item.desc}</p>
                <button
                  onClick={() => navigate(item.action)}
                  style={styles.actionButton}
                >
                  Go to {item.title}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Teacher-Created Tests</h3>
          <div style={styles.testList}>
            {tests.map((test) => (
              <div key={test._id} style={styles.testItem}>
                <span style={styles.testInfo}>
                  {test.title} ({test.subject}, {test.class}) - {test.status}
                </span>
                <div style={styles.testActions}>
                  <button
                    onClick={() => navigate(`/admin/tests/${test._id}`)}
                    style={styles.viewButton}
                  >
                    View
                  </button>
                  {test.status === 'draft' && (
                    <button
                      onClick={() => handleApproveTest(test._id)}
                      style={styles.approveButton}
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: {
    backgroundColor: '#b8c2cc',
    minHeight: '100vh',
    fontFamily: '"Fredoka", sans-serif',
    width: '100%',
    padding: '20px 0',
    animation: 'fadeIn 0.8s ease-in',
  },
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: '"Fredoka", sans-serif'
  },
  header: { 
    backgroundColor: '#2c3e50', 
    color: '#FFFFFF', 
    padding: '25px', 
    borderRadius: '12px', 
    marginBottom: '30px', 
    border: 'none', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    animation: 'slideDown 0.6s ease-out'
  },
  headerTitle: { fontSize: '28px', fontWeight: '700', margin: '0 0 10px 0' },
  headerSubtitle: { fontSize: '16px', margin: '0', color: '#bdc3c7' },
  alertError: { 
    backgroundColor: '#fee', 
    color: '#c33', 
    borderLeft: '4px solid #c33', 
    padding: '15px', 
    marginBottom: '25px', 
    borderRadius: '8px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px',
    animation: 'shake 0.5s ease-in-out'
  },
  alertIcon: { fontSize: '20px' },
  statsGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
    gap: '20px', 
    marginBottom: '30px' 
  },
  statCard: { 
    backgroundColor: '#FFFFFF', 
    padding: '25px', 
    borderRadius: '12px', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
    border: '1px solid #ecf0f1', 
    textAlign: 'center',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    animation: 'fadeInUp 0.6s ease-out'
  },
  statTitle: { fontSize: '16px', fontWeight: '600', color: '#2c3e50', marginBottom: '10px' },
  statValue: { fontSize: '32px', color: '#3498db', margin: '10px 0', fontWeight: '700' },
  actionsGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
    gap: '25px', 
    marginBottom: '30px' 
  },
  actionCard: { 
    backgroundColor: '#FFFFFF', 
    padding: '25px', 
    borderRadius: '12px', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
    border: '1px solid #ecf0f1', 
    display: 'flex', 
    alignItems: 'flex-start', 
    transition: 'all 0.3s ease',
    animation: 'fadeInUp 0.6s ease-out 0.1s both'
  },
  actionIcon: { fontSize: '32px', marginRight: '15px', color: '#3498db' },
  actionTitle: { fontSize: '20px', fontWeight: '600', color: '#2c3e50', marginBottom: '10px' },
  actionDesc: { fontSize: '14px', color: '#555', marginBottom: '20px', lineHeight: '1.5' },
  actionButton: { 
    padding: '10px 20px', 
    backgroundColor: '#3498db', 
    color: '#FFFFFF', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontSize: '14px', 
    transition: 'all 0.3s ease',
    fontWeight: '600'
  },
  section: { 
    backgroundColor: '#FFFFFF', 
    padding: '25px', 
    borderRadius: '12px', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
    border: '1px solid #ecf0f1',
    animation: 'fadeInUp 0.6s ease-out 0.2s both'
  },
  sectionTitle: { fontSize: '20px', fontWeight: '600', color: '#2c3e50', marginBottom: '20px' },
  testList: { display: 'flex', flexDirection: 'column', gap: '15px' },
  testItem: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '15px', 
    backgroundColor: '#f8f9fa', 
    borderRadius: '8px', 
    border: '1px solid #ecf0f1',
    transition: 'transform 0.2s ease'
  },
  testInfo: { fontSize: '14px', color: '#555', fontWeight: '500' },
  testActions: { display: 'flex', gap: '10px' },
  viewButton: { 
    padding: '8px 15px', 
    backgroundColor: '#95a5a6', 
    color: '#FFFFFF', 
    border: 'none', 
    borderRadius: '6px', 
    cursor: 'pointer', 
    fontSize: '12px', 
    transition: 'all 0.3s ease',
    fontWeight: '600'
  },
  approveButton: { 
    padding: '8px 15px', 
    backgroundColor: '#27ae60', 
    color: '#FFFFFF', 
    border: 'none', 
    borderRadius: '6px', 
    cursor: 'pointer', 
    fontSize: '12px', 
    transition: 'all 0.3s ease',
    fontWeight: '600'
  },
  accessDenied: { 
    textAlign: 'center', 
    padding: '4rem', 
    backgroundColor: '#FFFFFF', 
    borderRadius: '12px', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
    maxWidth: '600px', 
    margin: '2rem auto',
    animation: 'fadeIn 0.8s ease-in'
  },
  loading: { 
    padding: '20px', 
    color: '#FFFFFF', 
    backgroundColor: '#2c3e50', 
    textAlign: 'center', 
    fontSize: '18px', 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    fontFamily: '"Fredoka", sans-serif'
  },
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
const keyframes = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fadeInUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes slideDown {
  from { 
    opacity: 0;
    transform: translateY(-20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
`;

// Inject keyframes
if (styleSheet) {
  styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
}

// Add hover effects
const hoverStyles = `
  .statCard:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
  }
  .actionCard:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
  }
  .testItem:hover {
    transform: translateX(5px);
  }
  .actionButton:hover {
    background-color: #2980b9;
    transform: translateY(-2px);
  }
  .viewButton:hover {
    background-color: #7f8c8d;
    transform: translateY(-2px);
  }
  .approveButton:hover {
    background-color: #219653;
    transform: translateY(-2px);
  }
`;

// Inject hover styles
if (styleSheet) {
  const hoverStyleElement = document.createElement('style');
  hoverStyleElement.textContent = hoverStyles;
  document.head.appendChild(hoverStyleElement);
}

export default AdminHome;