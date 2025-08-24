import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

const TestDetails = () => {
  const { user } = useContext(AuthContext);
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTest = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTest(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load test details.');
      console.error('Fetch test details error:', err.response?.data, err.response?.status);
    }
    setLoading(false);
  }, [testId]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchTest();
    }
  }, [user, fetchTest]);

  if (loading) {
    return <div style={styles.loading}>Loading Test Details...</div>;
  }

  if (!test) {
    return (
      <div style={styles.container}>
        {error && (
          <div style={styles.alertError}>
            <FiAlertTriangle style={styles.alertIcon} />
            <span>{error}</span>
          </div>
        )}
        <p style={styles.noTest}>Test not found.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {error && (
        <div style={styles.alertError}>
          <FiAlertTriangle style={styles.alertIcon} />
          <span>{error}</span>
        </div>
      )}
      <button
        onClick={() => navigate('/admin/tests')}
        style={styles.backButton}
      >
        <FiArrowLeft style={styles.buttonIcon} />
        Back to Tests
      </button>
      <h2 style={styles.title}>{test.title}</h2>
      <div style={styles.testDetails}>
        <p><strong>Subject:</strong> {test.subject}</p>
        <p><strong>Class:</strong> {test.class}</p>
        <p><strong>Session:</strong> {test.session}</p>
        <p><strong>Duration:</strong> {test.duration} minutes</p>
        <p><strong>Question Count:</strong> {test.questionCount}</p>
        <p><strong>Randomize:</strong> {test.randomize ? 'Yes' : 'No'}</p>
        <p><strong>Created by:</strong> {test.createdBy?.username || 'Unknown'}</p>
        <p><strong>Status:</strong> {test.status}</p>
        {test.batches?.length > 0 && (
          <div>
            <h3 style={styles.subtitle}>Batches</h3>
            {test.batches.map((batch, index) => (
              <div key={index} style={styles.batch}>
                <p><strong>Batch {batch.name}:</strong></p>
                <p>Start: {new Date(batch.schedule.start).toLocaleString()}</p>
                <p>End: {new Date(batch.schedule.end).toLocaleString()}</p>
                <p>Students: {batch.students.length > 0 ? batch.students.join(', ') : 'None'}</p>
              </div>
            ))}
          </div>
        )}
        <h3 style={styles.subtitle}>Questions</h3>
        {test.questions?.length > 0 ? (
          test.questions.map((q, index) => (
            <div key={q._id || index} style={styles.question}>
              <p><strong>Question {index + 1}:</strong> {q.text}</p>
              <ul style={styles.options}>
                {q.options?.map((opt, i) => (
                  <li key={i} style={q.correctAnswer === i ? styles.correctOption : styles.option}>
                    {opt}
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p style={styles.noQuestions}>No questions available.</p>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'sans-serif',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4B5320',
    marginBottom: '20px',
  },
  subtitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#4B5320',
    margin: '20px 0 10px',
  },
  alertError: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    borderLeft: '4px solid #B22222',
    padding: '15px',
    marginBottom: '20px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertIcon: {
    fontSize: '20px',
  },
  testDetails: {
    fontSize: '14px',
    color: '#000000',
  },
  batch: {
    margin: '10px 0',
    padding: '10px',
    backgroundColor: '#F5F5F5',
    borderRadius: '4px',
  },
  question: {
    margin: '10px 0',
    padding: '10px',
    backgroundColor: '#F5F5F5',
    borderRadius: '4px',
  },
  options: {
    listStyle: 'none',
    padding: '0',
    margin: '10px 0',
  },
  option: {
    fontSize: '12px',
    color: '#000000',
  },
  correctOption: {
    fontSize: '12px',
    color: '#28a745',
    fontWeight: 'bold',
  },
  noQuestions: {
    fontSize: '14px',
    color: '#6B7280',
  },
  noTest: {
    fontSize: '16px',
    color: '#6B7280',
    textAlign: 'center',
  },
  backButton: {
    padding: '5px 10px',
    backgroundColor: '#6B7280',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginBottom: '20px',
  },
  buttonIcon: {
    fontSize: '14px',
  },
  loading: {
    padding: '20px',
    color: '#FFFFFF',
    backgroundColor: '#4B5320',
    textAlign: 'center',
    fontSize: '16px',
    borderRadius: '4px',
  },
};

export default TestDetails;