import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import useTeacherData from '../../hooks/useTeacherData';
import { FiSave, FiX, FiAlertTriangle, FiCheckCircle, FiImage } from 'react-icons/fi';

const QuestionSelection = () => {
  const { user } = useContext(AuthContext);
  const { testId } = useParams();
  const navigate = useNavigate();
  const { subjects, classes, loading: teacherDataLoading, error: teacherDataError } = useTeacherData();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    subject: '',
    class: '',
    text: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    marks: 1,
    imageUrl: null,
    saveToBank: false,
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (testId) {
      fetchTest();
      fetchQuestions();
    }
  }, [testId]);

  useEffect(() => {
    if (teacherDataError) {
      setError(teacherDataError);
    }
  }, [teacherDataError]);

  const fetchTest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const res = await axios.get(`http://localhost:5000/api/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTest(res.data);
      setSelectedQuestions(res.data.questions.map(q => q._id) || []);
      setError(null);
    } catch (err) {
      console.error(`[${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}] Fetch test error:`, err.response?.data || err.message);
      setError(err.response?.data?.error || 'Test not found.');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    }
    setLoading(false);
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const res = await axios.get('http://localhost:5000/api/questions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions(res.data);
      setError(null);
    } catch (err) {
      console.error(`[${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}] Fetch questions error:`, err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to load questions.');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    }
    setLoading(false);
  };

  const handleQuestionToggle = async (questionId) => {
    const updatedQuestions = selectedQuestions.includes(questionId)
      ? selectedQuestions.filter((id) => id !== questionId)
      : [...selectedQuestions, questionId];
    const totalMarks = updatedQuestions
      .map(id => questions.find(q => q._id === id)?.marks || 0)
      .reduce((sum, marks) => sum + marks, 0);
    if (test && totalMarks > test.totalScore) {
      setError(`Total marks (${totalMarks}) exceed test total score (${test.totalScore}).`);
      return;
    }
    if (test && updatedQuestions.length > test.questionCount) {
      setError(`Selected questions (${updatedQuestions.length}) exceed test question count (${test.questionCount}).`);
      return;
    }
    setSelectedQuestions(updatedQuestions);
    await saveQuestions(updatedQuestions);
  };

  const handleNewQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!newQuestion.text || newQuestion.options.some(opt => !opt) || !newQuestion.correctAnswer || !newQuestion.options.includes(newQuestion.correctAnswer)) {
      setError('Please fill all fields and ensure correct answer matches an option.');
      return;
    }
    if (isNaN(newQuestion.marks) || newQuestion.marks < 0) {
      setError('Marks must be a non-negative number.');
      return;
    }
    if (!newQuestion.subject || !newQuestion.class) {
      setError('Please select a subject and class.');
      return;
    }
    const totalMarks = selectedQuestions
      .map(id => questions.find(q => q._id === id)?.marks || 0)
      .reduce((sum, marks) => sum + marks, 0) + Number(newQuestion.marks);
    if (test && totalMarks > test.totalScore) {
      setError(`Total marks (${totalMarks}) exceed test total score (${test.totalScore}).`);
      return;
    }
    if (test && selectedQuestions.length + 1 > test.questionCount) {
      setError(`Adding this question would exceed test question count (${test.questionCount}).`);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const formData = new FormData();
      formData.append('subject', newQuestion.subject);
      formData.append('class', newQuestion.class);
      formData.append('text', newQuestion.text);
      formData.append('options', JSON.stringify(newQuestion.options));
      formData.append('correctAnswer', newQuestion.correctAnswer);
      formData.append('marks', Number(newQuestion.marks));
      formData.append('testId', testId);
      if (newQuestion.imageUrl) {
        formData.append('image', newQuestion.imageUrl);
      }
      formData.append('saveToBank', newQuestion.saveToBank);
      const res = await axios.post('http://localhost:5000/api/questions', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Question added successfully.');
      if (newQuestion.saveToBank) {
        setQuestions([...questions, res.data]);
      }
      const updatedQuestions = [...selectedQuestions, res.data._id];
      setSelectedQuestions(updatedQuestions);
      await saveQuestions(updatedQuestions);
      setNewQuestion({ subject: '', class: '', text: '', options: ['', '', '', ''], correctAnswer: '', marks: 1, imageUrl: null, saveToBank: false });
      setImagePreview(null);
    } catch (err) {
      console.error(`[${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}] New question error:`, err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to add question.');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    }
    setLoading(false);
  };

  const saveQuestions = async (questions) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      await axios.put(`http://localhost:5000/api/tests/${testId}`, { questions }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Questions saved to test successfully.');
    } catch (err) {
      console.error(`[${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}] Save questions error:`, err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to save questions.');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    }
  };

  const handleDone = () => {
    navigate('/teacher/tests');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB.');
      return;
    }
    setNewQuestion({ ...newQuestion, imageUrl: file });
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
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
  if (loading || teacherDataLoading) {
    return <div style={styles.loading}>Loading...</div>;
  }
  if (!test) {
    return (
      <div style={styles.error}>
        <FiAlertTriangle style={styles.alertIcon} />
        <p>{error || 'Test not found.'}</p>
      </div>
    );
  }

  const totalMarks = selectedQuestions
    .map(id => questions.find(q => q._id === id)?.marks || 0)
    .reduce((sum, marks) => sum + marks, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>Add Questions to Test: {test.title}</h2>
        <p style={styles.headerSubtitle}>
          Select or create questions for {test.subject} ({test.class}) | Questions: {selectedQuestions.length}/{test.questionCount} | Total Marks: {totalMarks}/{test.totalScore}
        </p>
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
        <h3 style={styles.sectionTitle}>Select Existing Questions</h3>
        {questions.filter(q => q.subject === test.subject && q.class === test.class).length === 0 ? (
          <p style={styles.noQuestions}>No questions available for {test.subject} ({test.class}). Create new questions below.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Select</th>
                <th style={styles.tableHeader}>Question Text</th>
                <th style={styles.tableHeader}>Options</th>
                <th style={styles.tableHeader}>Correct Answer</th>
                <th style={styles.tableHeader}>Marks</th>
                <th style={styles.tableHeader}>Image</th>
              </tr>
            </thead>
            <tbody>
              {questions
                .filter(q => q.subject === test.subject && q.class === test.class)
                .map(q => (
                  <tr key={q._id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(q._id)}
                        onChange={() => handleQuestionToggle(q._id)}
                        style={styles.checkbox}
                      />
                    </td>
                    <td style={styles.tableCell}>{q.text}</td>
                    <td style={styles.tableCell}>{q.options.join(', ')}</td>
                    <td style={styles.tableCell}>{q.correctAnswer}</td>
                    <td style={styles.tableCell}>{q.marks}</td>
                    <td style={styles.tableCell}>
                      {q.imageUrl ? (
                        <img src={q.imageUrl} alt="Question" style={styles.questionImage} />
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Create New Question</h3>
        <form onSubmit={handleNewQuestionSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Subject*</label>
            <select
              value={newQuestion.subject}
              onChange={(e) => setNewQuestion({ ...newQuestion, subject: e.target.value })}
              required
              style={styles.input}
              disabled={test && test.subject}
            >
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Class*</label>
            <select
              value={newQuestion.class}
              onChange={(e) => setNewQuestion({ ...newQuestion, class: e.target.value })}
              required
              style={styles.input}
              disabled={test && test.class}
            >
              <option value="">Select Class</option>
              {classes.map(classItem => (
                <option key={classItem} value={classItem}>{classItem}</option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Question Text*</label>
            <input
              type="text"
              placeholder="Enter question text"
              value={newQuestion.text}
              onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
              required
              style={styles.input}
            />
          </div>
          {newQuestion.options.map((opt, index) => (
            <div key={index} style={styles.formGroup}>
              <label style={styles.label}>Option {index + 1}*</label>
              <input
                type="text"
                placeholder={`Option ${index + 1}`}
                value={opt}
                onChange={(e) => {
                  const newOptions = [...newQuestion.options];
                  newOptions[index] = e.target.value;
                  setNewQuestion({ ...newQuestion, options: newOptions });
                }}
                required
                style={styles.input}
              />
            </div>
          ))}
          <div style={styles.formGroup}>
            <label style={styles.label}>Correct Answer*</label>
            <select
              value={newQuestion.correctAnswer}
              onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
              required
              style={styles.input}
            >
              <option value="">Select Correct Answer</option>
              {newQuestion.options.map((opt, index) => (
                <option key={index} value={opt}>{opt || `Option ${index + 1}`}</option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Marks*</label>
            <input
              type="number"
              placeholder="Enter marks"
              value={newQuestion.marks}
              onChange={(e) => setNewQuestion({ ...newQuestion, marks: e.target.value })}
              required
              style={styles.input}
              min="0"
              step="0.5"
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={styles.fileInput}
            />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" style={styles.imagePreview} />
            )}
          </div>
          <div style={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="saveToBank"
              checked={newQuestion.saveToBank}
              onChange={(e) => setNewQuestion({ ...newQuestion, saveToBank: e.target.checked })}
              style={styles.checkbox}
            />
            <label htmlFor="saveToBank" style={styles.checkboxLabel}>Save to Question Bank</label>
          </div>
          <div style={styles.formActions}>
            <button
              type="submit"
              disabled={loading}
              style={loading ? { ...styles.submitButton, backgroundColor: '#ccc' } : styles.submitButton}
            >
              <FiSave style={styles.buttonIcon} />
              Add Question
            </button>
          </div>
        </form>
      </div>

      <div style={styles.formActions}>
        <button
          onClick={handleDone}
          style={styles.cancelButton}
        >
          <FiX style={styles.buttonIcon} />
          Done
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'sans-serif',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
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
  sectionTitle: {
    color: '#4B5320',
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 15px 0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid #E0E0E0',
  },
  tableHeader: {
    border: '1px solid #E0E0E0',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    color: '#4B5320',
    fontWeight: '600',
  },
  tableRow: {
    borderBottom: '1px solid #E0E0E0',
  },
  tableCell: {
    border: '1px solid #E0E0E0',
    padding: '12px',
    textAlign: 'left',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#4B5320',
  },
  noQuestions: {
    color: '#4B5320',
    fontSize: '14px',
    margin: '0 0 20px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '400px',
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
    fontSize: '14px',
  },
  fileInput: {
    padding: '12px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
  },
  imagePreview: {
    maxWidth: '200px',
    marginTop: '10px',
    borderRadius: '6px',
  },
  questionImage: {
    maxWidth: '100px',
    borderRadius: '6px',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  checkboxLabel: {
    color: '#4B5320',
    fontSize: '14px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '15px',
    marginTop: '20px',
  },
  submitButton: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
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
  loading: {
    textAlign: 'center',
    padding: '4rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    margin: '2rem auto',
  },
  error: {
    textAlign: 'center',
    padding: '4rem',
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    margin: '2rem auto',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    justifyContent: 'center',
  },
};

export default QuestionSelection;
