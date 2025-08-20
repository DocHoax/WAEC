import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useTeacherData from '../../hooks/useTeacherData';
import { FiSave, FiX, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const AddTestQuestions = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user, questions, tests, fetchTests, error, setError, success, setSuccess } = useTeacherData();
  const [test, setTest] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionMarks, setQuestionMarks] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTestAndQuestions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found.');
        console.log('AddTestQuestions - Fetching test:', { testId });
        const res = await axios.get(`http://localhost:5000/api/tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTest(res.data);
        setSelectedQuestions(res.data.questions || []);
        setQuestionMarks(
          res.data.questions?.reduce((acc, qId, index) => ({
            ...acc,
            [qId]: res.data.questionMarks?.[index] || 1,
          }), {}) || {}
        );
      } catch (err) {
        const errorMessage = err.response?.data?.error || err.message;
        console.error('AddTestQuestions - Fetch test error:', errorMessage);
        setError(errorMessage || 'Failed to load test. Please try again.');
        navigate('/teacher/tests');
      }
    };
    fetchTestAndQuestions();
  }, [testId, setError, navigate]);

  const handleQuestionToggle = (questionId) => {
    if (selectedQuestions.includes(questionId)) {
      setSelectedQuestions(selectedQuestions.filter(id => id !== questionId));
      setQuestionMarks(prev => {
        const newMarks = { ...prev };
        delete newMarks[questionId];
        return newMarks;
      });
    } else if (selectedQuestions.length < test?.questionCount) {
      setSelectedQuestions([...selectedQuestions, questionId]);
      setQuestionMarks(prev => ({ ...prev, [questionId]: 1 }));
    } else {
      setError(`Cannot select more than ${test.questionCount} questions.`);
    }
  };

  const handleMarkChange = (questionId, value) => {
    const newMarks = { ...questionMarks, [questionId]: Math.max(1, Number(value) || 1) };
    setQuestionMarks(newMarks);
    const totalMarks = Object.values(newMarks).reduce((sum, mark) => sum + mark, 0);
    const requiredMarks = test.title.includes('CA') ? 20 : 60;
    if (totalMarks > requiredMarks) {
      setError(`Total marks (${totalMarks}) exceed required ${requiredMarks}.`);
    } else {
      setError(null);
    }
  };

  const handleSaveQuestions = async () => {
    if (!test) {
      setError('Test not loaded. Please try again.');
      return;
    }
    if (selectedQuestions.length !== test.questionCount) {
      setError(`Please select exactly ${test.questionCount} questions.`);
      return;
    }
    const totalMarks = Object.values(questionMarks).reduce((sum, mark) => sum + mark, 0);
    const requiredMarks = test.title.includes('CA') ? 20 : 60;
    if (totalMarks !== requiredMarks) {
      setError(`Total marks (${totalMarks}) must equal ${requiredMarks}.`);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const payload = {
        questions: selectedQuestions,
        questionMarks: selectedQuestions.map(qId => questionMarks[qId] || 1),
      };
      console.log('AddTestQuestions - Sending payload:', payload);
      const res = await axios.put(
        `http://localhost:5000/api/tests/${testId}/questions`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Questions added to test successfully.');
      await fetchTests();
      navigate('/teacher/tests');
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      console.error('AddTestQuestions - Save questions error:', errorMessage);
      setError(errorMessage || 'Failed to save questions. Please try again.');
    }
    setLoading(false);
  };

  if (!user || user.role !== 'teacher') {
    return (
      <div style={styles.accessDenied}>
        <h2>Access Restricted</h2>
        <p>This page is only available to authorized teachers.</p>
      </div>
    );
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
        <p>Loading test...</p>
      </div>
    );
  }

  const availableQuestions = questions.filter(
    q => q.subject === test.subject && q.class === test.class
  );
  const totalMarks = Object.values(questionMarks).reduce((sum, mark) => sum + mark, 0);
  const requiredMarks = test.title.includes('CA') ? 20 : 60;
  const progress = (totalMarks / requiredMarks) * 100;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>Add Questions to {test.title}</h2>
        <p style={styles.headerSubtitle}>
          Select exactly {test.questionCount} questions for {test.subject} ({test.class}). Total marks: {totalMarks}/{requiredMarks}
        </p>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${Math.min(progress, 100)}%` }} />
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
        <h3 style={styles.sectionTitle}>Available Questions</h3>
        <p style={styles.sectionSubtitle}>
          Showing {availableQuestions.length} question{availableQuestions.length !== 1 ? 's' : ''} from the question bank
        </p>
        {availableQuestions.length === 0 ? (
          <p style={styles.noQuestions}>
            No questions available for {test.subject} ({test.class}). Add or import questions first.
          </p>
        ) : (
          <div style={styles.questionList}>
            {availableQuestions.map(q => (
              <div key={q._id} style={styles.questionItem}>
                <input
                  type="checkbox"
                  checked={selectedQuestions.includes(q._id)}
                  onChange={() => handleQuestionToggle(q._id)}
                  disabled={
                    !selectedQuestions.includes(q._id) && selectedQuestions.length >= test.questionCount
                  }
                  style={styles.checkbox}
                />
                <div style={styles.questionContent}>
                  <p style={styles.questionText}>{q.text}</p>
                  <p style={styles.questionDetails}>
                    Options: {q.options.join(', ')} | Correct: {q.correctAnswer}
                  </p>
                  <p style={styles.questionSource}>
                    Source: {q.source === 'imported' ? 'Bulk Import' : 'Manually Created'}
                  </p>
                  {selectedQuestions.includes(q._id) && (
                    <div style={styles.marksInput}>
                      <label style={styles.marksLabel}>Marks:</label>
                      <input
                        type="number"
                        min="1"
                        value={questionMarks[q._id] || 1}
                        onChange={(e) => handleMarkChange(q._id, e.target.value)}
                        style={styles.marksField}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={styles.formActions}>
          <button
            type="button"
            onClick={() => navigate('/teacher/add-question')}
            style={styles.addQuestionButton}
          >
            Add New Question
          </button>
          <button
            type="button"
            onClick={() => navigate('/teacher/bulk-import')}
            style={styles.importButton}
          >
            Import Questions
          </button>
          <button
            type="button"
            onClick={() => navigate('/teacher/tests')}
            style={styles.cancelButton}
          >
            <FiX style={styles.buttonIcon} />
            Cancel
          </button>
          <button
            onClick={handleSaveQuestions}
            disabled={loading || selectedQuestions.length !== test.questionCount || totalMarks !== requiredMarks}
            style={
              selectedQuestions.length === test.questionCount && totalMarks === requiredMarks
                ? styles.submitButton
                : { ...styles.submitButton, backgroundColor: '#ccc', cursor: 'not-allowed' }
            }
          >
            <FiSave style={styles.buttonIcon} />
            Save Questions
          </button>
        </div>
      </div>
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
    margin: '0 0 10px 0',
    color: '#D4A017',
  },
  progressBar: {
    height: '10px',
    backgroundColor: '#E0E0E0',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4B5320',
    transition: 'width 0.3s ease-in-out',
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
  sectionTitle: {
    color: '#4B5320',
    fontSize: '20px',
    fontWeight: '600',
    margin: '0 0 10px 0',
  },
  sectionSubtitle: {
    color: '#6B7280',
    fontSize: '14px',
    margin: '0 0 20px 0',
  },
  noQuestions: {
    color: '#4B5320',
    fontSize: '16px',
    textAlign: 'center',
  },
  questionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '20px',
  },
  questionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px',
    borderBottom: '1px solid #E0E0E0',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#4B5320',
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    margin: '0 0 5px 0',
    fontSize: '16px',
    color: '#4B5320',
  },
  questionDetails: {
    margin: '0 0 5px 0',
    fontSize: '14px',
    color: '#6B7280',
  },
  questionSource: {
    margin: '0',
    fontSize: '12px',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  marksInput: {
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  marksLabel: {
    fontSize: '14px',
    color: '#4B5320',
  },
  marksField: {
    width: '60px',
    padding: '5px',
    border: '1px solid #E0E0E0',
    borderRadius: '4px',
  },
  formActions: {
    display: 'flex',
    gap: '15px',
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
  addQuestionButton: {
    backgroundColor: '#D4A017',
    color: '#4B5320',
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
  importButton: {
    backgroundColor: '#6B7280',
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
  buttonIcon: {
    fontSize: '18px',
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

export default AddTestQuestions;