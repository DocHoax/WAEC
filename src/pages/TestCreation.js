import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useTeacherData from '../hooks/useTeacherData';
import axios from 'axios';
import { FiSave, FiX, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const TestCreation = () => {
  const { user, tests, fetchTests, error, success, setError, setSuccess } = useTeacherData();
  const { testId } = useParams();
  const navigate = useNavigate();
  const [testForm, setTestForm] = useState({
    title: '',
    subject: '',
    class: '',
    session: '',
    duration: '',
    questionCount: '',
    totalMarks: '',
    randomize: false,
    instructions: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [createdTestId, setCreatedTestId] = useState(null);

  useEffect(() => {
    const fetchActiveSession = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/sessions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const activeSession = res.data.find(session => session.isActive);
        if (activeSession) {
          setTestForm(prev => ({ ...prev, session: activeSession.sessionName }));
        } else {
          setError('No active session set. Contact admin.');
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load active session.');
      }
    };
    fetchActiveSession();
    if (testId) {
      const test = tests.find(t => t._id === testId);
      if (test) {
        setTestForm({
          title: test.title || '',
          subject: test.subject || '',
          class: test.class || '',
          session: test.session || '',
          duration: test.duration || '',
          questionCount: test.questionCount || '',
          totalMarks: test.totalMarks || (test.title.includes('CA') ? 20 : 60),
          randomize: test.randomize || false,
          instructions: test.instructions || '',
        });
      } else {
        setError('Test not found or you do not have access.');
        navigate('/teacher/tests');
      }
    }
  }, [testId, tests, navigate, setError]);

  const isFormValid = () => {
    return (
      testForm.title &&
      ['Continuous Assessment 1 (CA 1)', 'Continuous Assessment 2 (CA 2)', 'Examination'].includes(testForm.title) &&
      testForm.subject?.trim() &&
      testForm.class?.trim() &&
      testForm.session?.match(/^\d{4}\/\d{4} (First|Second|Third) Term$/) &&
      Number(testForm.duration) > 0 &&
      Number(testForm.questionCount) > 0 &&
      Number(testForm.totalMarks) > 0 &&
      user?.subjects?.some(sub => sub.subject === testForm.subject && sub.class === testForm.class)
    );
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    const totalMarks = title.includes('CA') ? 20 : 60;
    setTestForm({ ...testForm, title, totalMarks });
  };

  const handleTestSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) {
      setError('Please fill all fields correctly, ensure duration, question count, and total marks are positive numbers, and subject/class are assigned.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const testData = {
        title: testForm.title,
        subject: testForm.subject,
        class: testForm.class,
        session: testForm.session,
        duration: Number(testForm.duration),
        questionCount: Number(testForm.questionCount),
        totalMarks: Number(testForm.totalMarks),
        randomize: testForm.randomize,
        instructions: testForm.instructions.trim(),
        status: 'draft',
      };
      let res;
      if (testId) {
        const verifyRes = await axios.get(`http://localhost:5000/api/tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!verifyRes.data._id) throw new Error('Test not found.');
        res = await axios.put(`http://localhost:5000/api/tests/${testId}`, testData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('Test updated and saved to draft.');
        await fetchTests();
      } else {
        res = await axios.post('http://localhost:5000/api/tests', testData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCreatedTestId(res.data._id);
        setSuccess('Saved to draft.');
        setTestForm({
          title: '',
          subject: '',
          class: '',
          session: testForm.session,
          duration: '',
          questionCount: '',
          totalMarks: '',
          randomize: false,
          instructions: '',
        });
        await fetchTests();
        setShowPrompt(true);
      }
    } catch (err) {
      console.error('Test submit error:', {
        message: err.message,
        response: err.response?.data || 'No response data',
        status: err.response?.status || 'No status',
      });
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to create or edit this test.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to process test. Please check your input and try again.');
      }
    }
    setLoading(false);
  };

  const handleSaveTest = async () => {
    setShowPrompt(false);
    setSuccess(null);
    await fetchTests();
    navigate('/teacher/tests');
  };

  const handleAddQuestions = async () => {
    setShowPrompt(false);
    setSuccess(null);
    const token = localStorage.getItem('token');
    try {
      await axios.get(`http://localhost:5000/api/tests/${createdTestId || testId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchTests();
      navigate(`/teacher/test-creation/${createdTestId || testId}/add-questions`);
    } catch (err) {
      console.error('Test verification error:', err.response?.data || err.message);
      setError('Test not found. Please try again.');
    }
  };

  if (!user || user.role !== 'teacher') {
    return (
      <div style={styles.accessDenied}>
        <h2>Access Restricted</h2>
        <p>This page is only available to authorized teachers.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>{testId ? 'Edit Test' : 'Create New Test'}</h2>
        <p style={styles.headerSubtitle}>Set up your test details below</p>
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
        <form onSubmit={handleTestSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Test Title*</label>
            <select
              value={testForm.title}
              onChange={handleTitleChange}
              required
              style={styles.select}
            >
              <option value="">Select Title</option>
              <option value="Continuous Assessment 1 (CA 1)">Continuous Assessment 1 (CA 1)</option>
              <option value="Continuous Assessment 2 (CA 2)">Continuous Assessment 2 (CA 2)</option>
              <option value="Examination">Examination</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Subject*</label>
            <select
              value={testForm.subject}
              onChange={(e) => setTestForm({ ...testForm, subject: e.target.value })}
              required
              style={styles.select}
            >
              <option value="">Select Subject</option>
              {(user.subjects || []).map(sub => (
                <option key={sub._id} value={sub.subject}>{sub.subject}</option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Class*</label>
            <select
              value={testForm.class}
              onChange={(e) => setTestForm({ ...testForm, class: e.target.value })}
              required
              style={styles.select}
            >
              <option value="">Select Class</option>
              {(user.subjects || []).map(sub => (
                <option key={sub._id} value={sub.class}>{sub.class}</option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Session*</label>
            <input
              type="text"
              value={testForm.session}
              disabled
              style={{ ...styles.input, backgroundColor: '#e0e0e0' }}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Instructions</label>
            <textarea
              value={testForm.instructions}
              onChange={(e) => setTestForm({ ...testForm, instructions: e.target.value })}
              style={styles.input}
              placeholder="Enter test instructions"
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Duration (minutes)*</label>
            <input
              type="number"
              value={testForm.duration}
              onChange={(e) => setTestForm({ ...testForm, duration: e.target.value })}
              required
              min="1"
              style={styles.input}
              placeholder="Enter duration in minutes"
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Number of Questions*</label>
            <input
              type="number"
              value={testForm.questionCount}
              onChange={(e) => setTestForm({ ...testForm, questionCount: e.target.value })}
              required
              min="1"
              style={styles.input}
              placeholder="Enter number of questions"
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Total Marks*</label>
            <input
              type="number"
              value={testForm.totalMarks}
              disabled
              style={{ ...styles.input, backgroundColor: '#e0e0e0' }}
            />
          </div>
          <div style={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="randomize"
              checked={testForm.randomize}
              onChange={(e) => setTestForm({ ...testForm, randomize: e.target.checked })}
              style={styles.checkbox}
            />
            <label htmlFor="randomize" style={styles.checkboxLabel}>Randomize Questions</label>
          </div>
          <div style={styles.formActions}>
            <button
              type="button"
              onClick={() => navigate('/teacher/tests')}
              style={styles.cancelButton}
            >
              <FiX style={styles.buttonIcon} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              style={isFormValid() ? styles.submitButton : { ...styles.submitButton, backgroundColor: '#ccc', cursor: 'not-allowed' }}
            >
              <FiSave style={styles.buttonIcon} />
              {testId ? 'Update Test' : 'Create Test'}
            </button>
          </div>
        </form>
      </div>

      {showPrompt && (
        <div style={styles.prompt}>
          <h3 style={styles.promptTitle}>Test Created</h3>
          <p style={styles.promptText}>Would you like to add questions to this test now?</p>
          <div style={styles.promptActions}>
            <button onClick={handleSaveTest} style={styles.promptButton}>
              Save Test
            </button>
            <button onClick={handleAddQuestions} style={styles.promptButtonPrimary}>
              Add Questions
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'sans-serif',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  header: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    padding: '25px',
    borderRadius: '8px',
    marginBottom: '25px',
    border: '1px solid #000000',
    boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  headerSubtitle: {
    fontSize: '16px',
    margin: '0',
    color: '#D4A017',
  },
  alertError: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    borderLeft: '4px solid #B22222',
    padding: '15px',
    marginBottom: '25px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertSuccess: {
    backgroundColor: '#d4edda',
    color: '#155724',
    borderLeft: '4px solid #28a745',
    padding: '15px',
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
    marginBottom: '25px',
  },
  form: {
    maxWidth: '600px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    color: '#4B5320',
    fontWeight: '600',
    fontSize: '14px',
  },
  input: {
    padding: '12px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    fontSize: '16px',
  },
  select: {
    padding: '12px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    fontSize: '16px',
    backgroundColor: 'white',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#4B5320',
  },
  checkboxLabel: {
    color: '#4B5320',
    fontSize: '14px',
  },
  formActions: {
    display: 'flex',
    gap: '15px',
    marginTop: '30px',
    justifyContent: 'flex-end',
  },
  submitButton: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    color: '#4B5320',
    border: '1px solid #4B5320',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  buttonIcon: {
    fontSize: '18px',
  },
  prompt: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
    marginTop: '25px',
    textAlign: 'center',
  },
  promptTitle: {
    color: '#4B5320',
    fontSize: '20px',
    fontWeight: '600',
    margin: '0 0 15px 0',
  },
  promptText: {
    color: '#4B5320',
    fontSize: '16px',
    margin: '0 0 20px 0',
  },
  promptActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
  },
  promptButton: {
    backgroundColor: 'transparent',
    color: '#4B5320',
    border: '1px solid #4B5320',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
  },
  promptButtonPrimary: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
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
};

export default TestCreation;