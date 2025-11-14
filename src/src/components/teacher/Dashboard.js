import React from 'react';
import { useNavigate } from 'react-router-dom';
import useTeacherData from '../../hooks/useTeacherData';
import { FiPlus, FiBook, FiBarChart2, FiEdit2, FiAlertTriangle, FiCheckCircle, FiUsers, FiFileText, FiCalendar } from 'react-icons/fi';

const Dashboard = () => {
  const { user, tests, questions, error, success, setError } = useTeacherData();
  const navigate = useNavigate();

  const handleEditTest = (testId) => {
    if (!testId || !/^[0-9a-fA-F]{24}$/.test(testId)) {
      console.error('Edit test error: Invalid testId:', testId);
      setError('Invalid test ID. Please select a valid test.');
      return;
    }
    navigate(`/teacher/test-creation/${testId}`);
  };

  const handleViewResults = (testId) => {
    console.log('Dashboard - Navigating to results for testId:', testId);
    if (!testId || !/^[0-9a-fA-F]{24}$/.test(testId)) {
      console.error('View results error: Invalid testId:', testId);
      setError('Invalid test ID. Please select a valid test.');
      return;
    }
    navigate(`/teacher/test-results/${testId}`);
  };

  // Calculate active and upcoming tests based on batches
  const activeTestsCount = tests.filter(t => 
    t.status === 'scheduled' && 
    t.batches?.some(batch => 
      batch.schedule?.start && 
      batch.schedule?.end && 
      new Date() >= new Date(batch.schedule.start) && 
      new Date() <= new Date(batch.schedule.end)
    )
  ).length;

  const upcomingTestsCount = tests.filter(t => 
    t.status === 'scheduled' && 
    t.batches?.some(batch => 
      batch.schedule?.start && 
      new Date(batch.schedule.start) > new Date()
    )
  ).length;

  const quickActions = [
    {
      label: 'Create Test',
      icon: <FiPlus size={20} />,
      action: () => navigate('/teacher/test-creation'),
      bgColor: '#4B5320',
    },
    {
      label: 'Add Question',
      icon: <FiFileText size={20} />,
      action: () => navigate('/teacher/add-question'),
      bgColor: '#D4A017',
    },
    {
      label: 'Manage Tests',
      icon: <FiBook size={20} />,
      action: () => navigate('/teacher/tests'),
      bgColor: '#4B5320',
    },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>Educator Dashboard</h2>
        <p style={styles.headerSubtitle}>
          Welcome back, <span style={styles.userName}>{user.name} {user.surname}</span>
        </p>
        <div style={styles.headerStats}>
          <div style={styles.headerStatItem}>
            <FiBook style={styles.headerStatIcon} />
            <span>{activeTestsCount} Active Tests</span>
          </div>
          <div style={styles.headerStatItem}>
            <FiUsers style={styles.headerStatIcon} />
            <span>{questions.length} Questions</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={styles.alertError}>
          <FiAlertTriangle style={styles.alertIcon} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={styles.alertSuccess}>
          <FiCheckCircle style={styles.alertIcon} />
          <span>{success}</span>
        </div>
      )}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Quick Actions</h3>
        <div style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              style={{ ...styles.actionButton, backgroundColor: action.bgColor }}
            >
              <span style={styles.actionIcon}>{action.icon}</span>
              <span style={styles.actionLabel}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Your Subjects</h3>
        {user.subjects && user.subjects.length > 0 ? (
          <div style={styles.subjectsGrid}>
            {user.subjects.map((sub, index) => (
              <div key={index} style={styles.subjectCard}>
                <div style={styles.subjectIcon}>
                  <FiBook size={24} />
                </div>
                <div>
                  <h4 style={styles.subjectTitle}>{sub.subject}</h4>
                  <p style={styles.subjectClass}>{sub.class}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.noSubjects}>No subjects assigned</p>
        )}
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <FiCalendar size={24} />
          </div>
          <div>
            <h3 style={styles.statTitle}>Active Tests</h3>
            <p style={styles.statValue}>{activeTestsCount}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <FiFileText size={24} />
          </div>
          <div>
            <h3 style={styles.statTitle}>Question Bank</h3>
            <p style={styles.statValue}>{questions.length}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <FiCalendar size={24} />
          </div>
          <div>
            <h3 style={styles.statTitle}>Upcoming Tests</h3>
            <p style={styles.statValue}>{upcomingTestsCount}</p>
          </div>
        </div>
      </div>

      <div style={styles.twoColumnLayout}>
        <div style={{ ...styles.section, flex: 2 }}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Recent Tests</h3>
            <button onClick={() => navigate('/teacher/tests')} style={styles.viewAllButton}>
              View All Tests
            </button>
          </div>
          {tests.length > 0 ? (
            <div style={styles.testList}>
              {tests.slice(0, 4).map(test => (
                <div key={test._id} style={styles.testCard}>
                  <div style={styles.testCardContent}>
                    <h4 style={styles.testTitle}>{test.title}</h4>
                    <p style={styles.testMeta}>
                      {test.subject} • {test.class} • Created: {new Date(test.createdAt).toLocaleDateString()}
                    </p>
                    {test.batches?.length > 0 && (
                      <p style={styles.testDates}>
                        {new Date(test.batches[0].schedule.start).toLocaleDateString()} -{' '}
                        {new Date(test.batches[0].schedule.end).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEditTest(test._id)} style={styles.viewButton}>
                      <FiEdit2 size={16} /> Manage
                    </button>
                    <button onClick={() => handleViewResults(test._id)} style={styles.viewButton}>
                      <FiUsers size={16} /> Results
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.noData}>
              <p style={styles.noDataText}>No tests created yet</p>
              <button onClick={() => navigate('/teacher/test-creation')} style={styles.createTestButton}>
                <FiPlus size={16} /> Create Your First Test
              </button>
            </div>
          )}
        </div>

        <div style={{ ...styles.section, flex: 1 }}>
          <h3 style={styles.sectionTitle}>Quick Analytics</h3>
          <div style={styles.analyticsCard}>
            <div style={styles.analyticsIllustration}>
              <FiBarChart2 size={48} style={styles.analyticsIcon} />
            </div>
            <p style={styles.analyticsText}>View performance metrics and student results for your tests.</p>
            <button onClick={() => navigate('/teacher/analytics')} style={styles.analyticsButton}>
              <FiBarChart2 size={18} /> Open Analytics Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: '"Fredoka", sans-serif',
    padding: '20px',
    backgroundColor: '#b8c2cc',
  },
  header: {
    backgroundColor: '#2c3e50',
    color: '#FFFFFF',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '25px',
    border: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '600',
    margin: '0 0 10px 0',
  },
  headerSubtitle: {
    fontSize: '14px',
    margin: '0',
    color: '#bdc3c7',
  },
  userName: {
    fontWeight: '600',
  },
  headerStats: {
    display: 'flex',
    gap: '16px',
    marginTop: '12px',
  },
  headerStatItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#ecf0f1',
  },
  headerStatIcon: {
    color: '#3498db',
  },
  alertError: {
    backgroundColor: '#fee',
    color: '#c33',
    borderLeft: '4px solid #c33',
    padding: '12px 15px',
    marginBottom: '25px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertSuccess: {
    backgroundColor: '#efe',
    color: '#3c3',
    borderLeft: '4px solid #3c3',
    padding: '12px 15px',
    marginBottom: '25px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertIcon: {
    fontSize: '20px',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '25px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    border: '1px solid #ecf0f1',
    marginBottom: '25px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    color: '#2c3e50',
    fontSize: '18px',
    fontWeight: '600',
    margin: '0',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  actionButton: {
    color: '#FFFFFF',
    border: 'none',
    padding: '20px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    minHeight: '120px',
    transition: 'all 0.3s ease',
  },
  actionIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  actionLabel: {
    fontSize: '15px',
    fontWeight: '600',
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid #ecf0f1',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  subjectIcon: {
    backgroundColor: '#f8f9fa',
    color: '#3498db',
    width: '48px',
    height: '48px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  subjectTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0',
  },
  subjectClass: {
    fontSize: '14px',
    color: '#555',
    margin: '0',
  },
  noSubjects: {
    color: '#555',
    fontSize: '14px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '25px',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid #ecf0f1',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  statIcon: {
    backgroundColor: '#f0f4f8',
    color: '#3498db',
    width: '48px',
    height: '48px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#555',
    margin: '0 0 4px 0',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0',
  },
  viewAllButton: {
    backgroundColor: 'transparent',
    color: '#3498db',
    border: '1px solid #3498db',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  },
  twoColumnLayout: {
    display: 'flex',
    gap: '24px',
  },
  testList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #ecf0f1',
    borderRadius: '6px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  testCardContent: {
    flex: 1,
  },
  testTitle: {
    color: '#2c3e50',
    fontSize: '15px',
    fontWeight: '600',
    margin: '0 0 6px 0',
  },
  testMeta: {
    color: '#555',
    fontSize: '13px',
    margin: '0 0 6px 0',
  },
  testDates: {
    color: '#999',
    fontSize: '12px',
    margin: '0',
  },
  viewButton: {
    backgroundColor: 'transparent',
    color: '#3498db',
    border: '1px solid #3498db',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.3s ease',
  },
  noData: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
  noDataText: {
    color: '#555',
    marginBottom: '16px',
  },
  createTestButton: {
    backgroundColor: '#3498db',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  analyticsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    padding: '24px',
    textAlign: 'center',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid #ecf0f1',
  },
  analyticsIllustration: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  analyticsIcon: {
    color: '#3498db',
  },
  analyticsText: {
    color: '#555',
    margin: '0 0 20px 0',
    fontSize: '14px',
  },
  analyticsButton: {
    backgroundColor: '#3498db',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
};

export default Dashboard;