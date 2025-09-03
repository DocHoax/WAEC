import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiSave, FiX, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import axios from 'axios';

const SelectQuestions = () => {
  const { user } = useContext(AuthContext);
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionMarks, setQuestionMarks] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found.');

        // Fetch test
        const testRes = await axios.get(`https://waec-gfv0.onrender.com/api/tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fetchedTest = testRes.data;
        if (fetchedTest.createdBy !== user?._id || fetchedTest.status !== 'draft') {
          setError('Test not found or not editable.');
          setTimeout(() => navigate('/teacher/tests'), 2000);
          return;
        }
        setTest(fetchedTest);
        setSelectedQuestions(fetchedTest.questions || []);
        setQuestionMarks(fetchedTest.questionMarks || []);

        // Fetch questions
        const questionsRes = await axios.get('https://waec-gfv0.onrender.com/api/questions', {
          headers: { Authorization: `Bearer ${token}` },
          params: { subject: fetchedTest.subject, class: fetchedTest.class },
        });
        setQuestions(questionsRes.data);
      } catch (err) {
        console.error('Fetch data error:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });
        setError(err.response?.data?.error || 'Failed to load test or questions. Please try again.');
      }
    };
    fetchData();
  }, [testId, user, navigate]);

  const handleSelectQuestion = (question) => {
    if (selectedQuestions.some(q => q._id === question._id)) {
      setSelectedQuestions(selectedQuestions.filter(q => q._id !== question._id));
      setQuestionMarks(questionMarks.filter((_, i) => selectedQuestions[i]._id !== question._id));
    } else {
      const maxMarks = test?.testType === 'Examination' ? 60 : 20;
      const currentMarks = questionMarks.reduce((sum, mark) => sum + Number(mark || 0), 0);
      if (selectedQuestions.length >= test?.questionCount) {
        setError(`Cannot add more than ${test.questionCount} questions.`);
        return;
      }
      if (currentMarks + Number(question.marks) > maxMarks) {
        setError(`Total marks cannot exceed ${maxMarks} for ${test.title}.`);
        return;
      }
      setSelectedQuestions([...selectedQuestions, question]);
      setQuestionMarks([...questionMarks, Number(question.marks)]);
    }
    setError(null);
  };

  const handleSaveQuestions = async () => {
    if (selectedQuestions.length > test?.questionCount) {
      setError(`Cannot add more than ${test.questionCount} questions.`);
      return;
    }
    const maxMarks = test?.testType === 'Examination' ? 60 : 20;
    const totalMarks = questionMarks.reduce((sum, mark) => sum + Number(mark), 0);
    if (totalMarks !== maxMarks) {
      setError(`Total marks (${totalMarks}) must equal ${maxMarks} for ${test.title}.`);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        questions: selectedQuestions.map(q => q._id),
        questionMarks,
      };
      await axios.put(`https://waec-gfv0.onrender.com/api/tests/${testId}/questions`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Test saved as draft successfully, waiting for admin approval, find in your Manage Tests.');
      setShowConfirmation(true);
    } catch (err) {
      console.error('Save questions error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.response?.data?.error || 'Failed to save test questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    setSuccess(null);
    setError(null);
    navigate(`/teacher/test-creation/${testId}`);
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
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>Select Questions for {test.title}</h2>
        <p style={styles.headerSubtitle}>Choose questions from the question bank</p>
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
        <h3 style={styles.subHeader}>Question Bank ({questions.length} questions)</h3>
        <p>Selected: {selectedQuestions.length}/{test.questionCount} | Total Marks: {questionMarks.reduce((sum, mark) => sum + Number(mark || 0), 0)}/{test.testType === 'Examination' ? 60 : 20}</p>
        <div style={styles.questionList}>
          {questions.map((question) => (
            <div key={question._id} style={styles.questionItem}>
              <input
                type="checkbox"
                checked={selectedQuestions.some(q => q._id === question._id)}
                onChange={() => handleSelectQuestion(question)}
                style={styles.checkbox}
              />
              <div>
                <p><strong>Question:</strong> {question.question} ({question.marks} marks)</p>
                <p><strong>Options:</strong> {question.options.join(', ')}</p>
                <p><strong>Correct Answer:</strong> {question.correctAnswer}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={styles.formActions}>
          <button
            type="button"
            onClick={() => navigate(`/teacher/test-creation/${testId}`)}
            style={styles.cancelButton}
          >
            <FiX style={styles.buttonIcon} />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveQuestions}
            disabled={loading || selectedQuestions.length === 0}
            style={selectedQuestions.length > 0 ? styles.submitButton : { ...styles.submitButton, backgroundColor: '#ccc', cursor: 'not-allowed' }}
          >
            <FiSave style={styles.buttonIcon} />
            Save Test
          </button>
        </div>
      </div>

      {showConfirmation && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Test Saved</h3>
            <div style={styles.modalContent}>
              <p>Test saved as draft successfully, waiting for admin approval, find in your Manage Tests.</p>
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={handleConfirmationClose}
                style={styles.closeButton}
                aria-label="Close confirmation modal"
              >
                OK
              </button>
            </div>
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
  },
  subHeader: {
    color: '#4B5320',
    fontSize: '18px',
    fontWeight: '600',
    margin: '10px 0',
  },
  questionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '20px',
  },
  questionItem: {
    border: '1px solid #E0E0E0',
    padding: '10px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#4B5320',
  },
  formActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'flex-end',
    marginTop: '30px',
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
  modalOverlay: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '1000',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '25px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 20px 0',
  },
  modalContent: {
    color: '#333',
    fontSize: '16px',
    lineHeight: '1.6',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  closeButton: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: '#4B5320',
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

export default SelectQuestions;