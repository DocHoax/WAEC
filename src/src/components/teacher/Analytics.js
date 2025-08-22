import React from 'react';
import useTeacherData from '../../hooks/useTeacherData';
import { FiBarChart2, FiAlertTriangle, FiCheckCircle, FiAward, FiUsers, FiBook, FiClock } from 'react-icons/fi';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement);

const Analytics = () => {
  const { analytics, tests, results, error, success, loading } = useTeacherData();

  // Log analytics to debug
  console.log('Analytics prop:', analytics);

  // Derive data for charts from analytics
  const performanceData = {
    labels: analytics.map(a => `${a.subject} (${a.class})`),
    datasets: [{
      label: 'Average Scores',
      data: analytics.map(a => a.averageScore),
      backgroundColor: ['#4B5320', '#D4A017', '#3a5c6e', '#6b8e23'],
      borderColor: ['#3a4218', '#c19115', '#2c4859', '#5a7a1a'],
      borderWidth: 1,
    }],
  };

  const testTrendsData = {
    labels: analytics.map(a => a.testTitle),
    datasets: [
      {
        label: 'Completion Rate',
        data: analytics.map(a => a.completionRate),
        backgroundColor: '#4B5320',
        borderColor: '#3a4218',
        borderWidth: 2,
      },
      {
        label: 'Average Score',
        data: analytics.map(a => a.averageScore),
        backgroundColor: '#D4A017',
        borderColor: '#c19115',
        borderWidth: 2,
        type: 'line',
        tension: 0.3,
      },
    ],
  };

  const studentPerformanceData = {
    labels: ['Top 25%', 'Middle 50%', 'Bottom 25%'],
    datasets: [{
      label: 'Students',
      data: [
        results.filter(r => r.score >= 75).length,
        results.filter(r => r.score >= 50 && r.score < 75).length,
        results.filter(r => r.score < 50).length,
      ],
      backgroundColor: ['#4B5320', '#D4A017', '#a8a8a8'],
      borderColor: ['#3a4218', '#c19115', '#888888'],
      borderWidth: 1,
    }],
  };

  // Calculate overview metrics
  const averageScore = analytics.length > 0 ? (analytics.reduce((sum, a) => sum + parseFloat(a.averageScore), 0) / analytics.length).toFixed(2) : 0;
  const totalStudents = results.length;
  const testsCompleted = tests.length;
  const avgTimeSpent = tests.length > 0 ? (tests.reduce((sum, t) => sum + (t.duration || 0), 0) / tests.length).toFixed(0) : 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <FiBarChart2 style={styles.headerIcon} />
          <div>
            <h1 style={styles.headerTitle}>Performance Analytics</h1>
            <p style={styles.headerSubtitle}>Insights and metrics for your classes</p>
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

      <div style={styles.content}>
        {loading ? (
          <div style={styles.emptyState}>
            <FiBarChart2 style={styles.emptyIcon} />
            <h3 style={styles.emptyTitle}>Loading Analytics...</h3>
          </div>
        ) : analytics.length === 0 ? (
          <div style={styles.emptyState}>
            <FiBarChart2 style={styles.emptyIcon} />
            <h3 style={styles.emptyTitle}>No Analytics Data Available</h3>
            <p style={styles.emptyText}>Run tests and collect student responses to generate performance insights.</p>
          </div>
        ) : (
          <>
            <div style={styles.overviewGrid}>
              <div style={styles.overviewCard}>
                <div style={styles.overviewIcon}>
                  <FiAward />
                </div>
                <div>
                  <h3 style={styles.overviewTitle}>Average Score</h3>
                  <p style={styles.overviewValue}>{averageScore}%</p>
                </div>
              </div>
              <div style={styles.overviewCard}>
                <div style={styles.overviewIcon}>
                  <FiUsers />
                </div>
                <div>
                  <h3 style={styles.overviewTitle}>Students Assessed</h3>
                  <p style={styles.overviewValue}>{totalStudents}</p>
                </div>
              </div>
              <div style={styles.overviewCard}>
                <div style={styles.overviewIcon}>
                  <FiBook />
                </div>
                <div>
                  <h3 style={styles.overviewTitle}>Tests Completed</h3>
                  <p style={styles.overviewValue}>{testsCompleted}</p>
                </div>
              </div>
              <div style={styles.overviewCard}>
                <div style={styles.overviewIcon}>
                  <FiClock />
                </div>
                <div>
                  <h3 style={styles.overviewTitle}>Avg. Time Spent</h3>
                  <p style={styles.overviewValue}>{avgTimeSpent} min</p>
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Subject Performance</h2>
              <div style={styles.chartContainer}>
                <Doughnut data={performanceData} options={doughnutOptions} />
              </div>
            </div>

            <div style={styles.chartsGrid}>
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Test Trends</h3>
                <div style={styles.chartWrapper}>
                  <Bar data={testTrendsData} options={barOptions} />
                </div>
              </div>
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Student Distribution</h3>
                <div style={styles.chartWrapper}>
                  <Doughnut data={studentPerformanceData} options={doughnutOptions} />
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Detailed Metrics</h2>
              <div style={styles.metricsGrid}>
                {analytics.map((metric, index) => (
                  <div key={index} style={styles.metricCard}>
                    <h3 style={styles.metricTitle}>{metric.testTitle} ({metric.subject}, {metric.class})</h3>
                    <p style={{ ...styles.metricValue, color: getMetricColor(metric.averageScore) }}>
                      {metric.averageScore}%
                    </p>
                    <p style={styles.metricDescription}>
                      Completion: {metric.completionRate}%, Top Student: {metric.topStudent}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const getMetricColor = (value) => {
  if (value >= 75) return '#28a745';
  if (value >= 50) return '#D4A017';
  return '#dc3545';
};

const doughnutOptions = {
  responsive: true,
  plugins: {
    legend: { position: 'bottom' },
    tooltip: {
      callbacks: {
        label: function (context) {
          return `${context.label}: ${context.raw}%`;
        },
      },
    },
  },
  cutout: '70%',
};

const barOptions = {
  responsive: true,
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      ticks: {
        callback: function (value) {
          return value + '%';
        },
      },
    },
  },
  plugins: {
    legend: { position: 'bottom' },
  },
};

const styles = {
  container: {
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
  },
  header: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    padding: '2rem',
    borderBottom: '1px solid #000000',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerIcon: {
    fontSize: '2.5rem',
    color: '#D4A017',
  },
  headerTitle: {
    fontSize: '1.8rem',
    margin: '0',
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: '1rem',
    margin: '0.5rem 0 0',
    color: '#D4A017',
  },
  alertError: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    borderLeft: '4px solid #B22222',
    padding: '1rem',
    margin: '0 auto 1.5rem',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    maxWidth: '1200px',
  },
  alertSuccess: {
    backgroundColor: '#d4edda',
    color: '#155724',
    borderLeft: '4px solid #28a745',
    padding: '1rem',
    margin: '0 auto 1.5rem',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    maxWidth: '1200px',
  },
  alertIcon: {
    fontSize: '1.2rem',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1.5rem',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '3rem',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
  },
  emptyIcon: {
    fontSize: '3rem',
    color: '#D4A017',
    marginBottom: '1rem',
  },
  emptyTitle: {
    color: '#4B5320',
    fontSize: '1.5rem',
    margin: '0 0 0.5rem',
  },
  emptyText: {
    color: '#666',
    fontSize: '1rem',
    margin: '0',
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  overviewIcon: {
    width: '3.5rem',
    height: '3.5rem',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    color: '#FFFFFF',
    backgroundColor: '#4B5320',
  },
  overviewTitle: {
    color: '#4B5320',
    fontSize: '1rem',
    margin: '0 0 0.25rem',
    fontWeight: '600',
  },
  overviewValue: {
    color: '#4B5320',
    fontSize: '1.5rem',
    margin: '0 0 0.25rem',
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    color: '#4B5320',
    fontSize: '1.25rem',
    margin: '0 0 1.5rem',
    fontWeight: '600',
  },
  chartContainer: {
    height: '400px',
    margin: '0 auto',
    position: 'relative',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
  },
  chartTitle: {
    color: '#4B5320',
    fontSize: '1.1rem',
    margin: '0 0 1rem',
    fontWeight: '600',
  },
  chartWrapper: {
    height: '300px',
    position: 'relative',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  metricCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: '6px',
    padding: '1rem',
    borderLeft: '4px solid #4B5320',
  },
  metricTitle: {
    color: '#4B5320',
    fontSize: '0.9rem',
    margin: '0 0 0.5rem',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: '1.5rem',
    margin: '0 0 0.25rem',
    fontWeight: '700',
  },
  metricDescription: {
    color: '#666',
    fontSize: '0.875rem',
    margin: '0',
  },
};

export default Analytics;