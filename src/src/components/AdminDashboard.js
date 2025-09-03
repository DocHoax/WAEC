import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiAlertTriangle, FiUsers, FiClipboard, FiBarChart, FiCalendar } from 'react-icons/fi';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [tests, setTests] = useState([]);
  const [examSchedules, setExamSchedules] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchClasses();
      fetchUsers();
      fetchTests();
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
        `https://waec-gfv0.onrender.com/api/tests/${testId}/schedule`,
        { status: 'scheduled' },
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
      <div style={styles.accessDenied}>
        <h2>Access Restricted</h2>
        <p>This page is only available to admins.</p>
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
          { title: 'User Management', desc: 'Manage teacher and student accounts', action: '/admin/users', icon: <FiUsers /> },
          { title: 'Test Management', desc: 'Review and approve teacher-created tests', action: '/admin/tests', icon: <FiClipboard /> },
          { title: 'View Results', desc: 'Review student exam results', action: '/admin/tests', icon: <FiBarChart /> },
          { title: 'Exam Scheduling', desc: 'Plan and manage exams', action: '/admin/exams', icon: <FiCalendar /> },
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
                <button
                  onClick={() => navigate(`/admin/results/${test._id}`)}
                  style={styles.viewButton}
                >
                  View Results
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
  );
};

const styles = {
  container: { padding: '20px', backgroundColor: '#f8f9fa', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' },
  header: { backgroundColor: '#4B5320', color: '#FFFFFF', padding: '25px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #000000', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' },
  headerTitle: { fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px 0' },
  headerSubtitle: { fontSize: '16px', margin: '0', color: '#D4A017' },
  alertError: { backgroundColor: '#FFF3F3', color: '#B22222', borderLeft: '4px solid #B22222', padding: '15px', marginBottom: '25px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px' },
  alertIcon: { fontSize: '20px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '25px' },
  statCard: { backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #E0E0E0', textAlign: 'center' },
  statTitle: { fontSize: '18px', fontWeight: 'bold', color: '#4B5320' },
  statValue: { fontSize: '24px', color: '#D4A017', margin: '10px 0' },
  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '25px' },
  actionCard: { backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #E0E0E0', display: 'flex', alignItems: 'flex-start', transition: 'transform 0.2s' },
  actionIcon: { fontSize: '28px', marginRight: '15px', color: '#4B5320' },
  actionTitle: { fontSize: '20px', fontWeight: 'bold', color: '#4B5320', marginBottom: '8px' },
  actionDesc: { fontSize: '14px', color: '#000000', marginBottom: '15px' },
  actionButton: { padding: '8px 16px', backgroundColor: '#D4A017', color: '#000000', border: '1px solid #000000', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  section: { backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #E0E0E0' },
  sectionTitle: { fontSize: '20px', fontWeight: 'bold', color: '#4B5320', marginBottom: '20px' },
  testList: { display: 'flex', flexDirection: 'column', gap: '15px' },
  testItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#F5F5F5', borderRadius: '4px', border: '1px solid #E0E0E0' },
  testInfo: { fontSize: '14px', color: '#000000' },
  testActions: { display: 'flex', gap: '10px' },
  viewButton: { padding: '5px 10px', backgroundColor: '#6B7280', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  approveButton: { padding: '5px 10px', backgroundColor: '#28a745', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  accessDenied: { textAlign: 'center', padding: '4rem', backgroundColor: '#FFFFFF', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '2rem auto' },
  loading: { padding: '20px', color: '#FFFFFF', backgroundColor: '#4B5320', textAlign: 'center', fontSize: '16px' },
};

export default AdminDashboard;