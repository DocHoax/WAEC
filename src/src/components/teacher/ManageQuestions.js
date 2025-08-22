import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import useTeacherData from '../../hooks/useTeacherData';
import axios from 'axios';

const ManageQuestions = () => {
  const { user, questions, fetchQuestions, error, success, setError, setSuccess, navigate } = useTeacherData();
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(false);

  const subjectOptions = [...new Set([
    ...(questions.map(q => q.subject).filter(Boolean)),
    ...(user?.subjects?.map(s => s.subject) || []),
  ])];
  const classOptions = [...new Set([
    ...(questions.map(q => q.class).filter(Boolean)),
    ...(user?.subjects?.map(s => s.class) || []),
  ])];

  useEffect(() => {
    // Trigger MathJax typesetting when questions load
    if (window.MathJax) {
      window.MathJax.typesetPromise();
    }
  }, [questions]);

  const handleEditQuestion = (question) => {
    navigate('/teacher/add-question', {
      state: {
        editQuestionId: question._id,
        questionForm: {
          subject: question.subject,
          class: question.class,
          text: question.text,
          options: question.options,
          correctAnswer: question.correctAnswer,
          formula: question.formula || '',
          saveToBank: question.saveToBank,
        },
      },
    });
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      await axios.delete(`http://localhost:5000/api/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Question deleted successfully.');
      fetchQuestions();
    } catch (err) {
      console.error('Delete question error:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to delete question. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleExportQuestions = () => {
    setError(null);
    setSuccess(null);
    try {
      const filteredQuestions = questions.filter(q =>
        (!filterSubject || q.subject === filterSubject) &&
        (!filterClass || q.class === filterClass)
      ).map(q => ({
        subject: q.subject,
        class: q.class,
        questionText: q.text,
        option1: q.options[0] || '',
        option2: q.options[1] || '',
        option3: q.options[2] || '',
        option4: q.options[3] || '',
        correctAnswer: q.correctAnswer,
        formula: q.formula || '',
      }));

      if (filteredQuestions.length === 0) {
        setError('No questions match the selected filters. Try adjusting your filters or add new questions.');
        return;
      }

      const csv = Papa.unparse(filteredQuestions, {
        quotes: true,
        delimiter: ',',
        header: true,
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `questions_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccess(`Exported ${filteredQuestions.length} questions successfully.`);
    } catch (err) {
      console.error('Export questions error:', err.message);
      setError('Failed to export questions. Please try again.');
    }
  };

  return (
    <div>
      <script src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js" id="MathJax-script"></script>
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px',
          borderLeft: '4px solid #dc3545',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '10px', fontSize: '20px' }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px',
          borderLeft: '4px solid #28a745',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '10px', fontSize: '20px' }}>✅</span>
          <span>{success}</span>
        </div>
      )}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '25px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        marginBottom: '30px'
      }}>
        <h2 style={{
          color: '#4B5320',
          marginTop: '0',
          marginBottom: '20px',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '10px' }}>📝</span>
          Manage Questions
        </h2>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4B5320',
              fontWeight: '600'
            }}>
              Filter by Subject
            </label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: 'white'
              }}
            >
              <option value="">All Subjects</option>
              {subjectOptions.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4B5320',
              fontWeight: '600'
            }}>
              Filter by Class
            </label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: 'white'
              }}
            >
              <option value="">All Classes</option>
              {classOptions.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button
              onClick={handleExportQuestions}
              disabled={questions.length === 0 || loading}
              style={{
                backgroundColor: (questions.length === 0 || loading) ? '#ccc' : '#4B5320',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: (questions.length === 0 || loading) ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span style={{ marginRight: '8px' }}>📥</span>
              Export Questions
            </button>
          </div>
        </div>
        {questions.length === 0 ? (
          <div style={{
            backgroundColor: '#fff8e1',
            borderLeft: '4px solid #FFD700',
            padding: '20px',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: '#4B5320' }}>
              No questions found in the question bank. Add questions using the "Add Question" or "Bulk Import" tabs.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '20px'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#4B5320',
                  color: 'white'
                }}>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Question</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Formula</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Subject</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Class</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions
                  .filter(q => (!filterSubject || q.subject === filterSubject) && (!filterClass || q.class === filterClass))
                  .map(question => (
                    <tr key={question._id} style={{
                      borderBottom: '1px solid #eee',
                    }}>
                      <td style={{ padding: '12px 15px', maxWidth: '300px', wordBreak: 'break-word' }}>
                        {question.text}
                      </td>
                      <td style={{ padding: '12px 15px' }}>
                        {question.formula ? (
                          <div className="mathjax" dangerouslySetInnerHTML={{ __html: `\\(${question.formula}\\)` }} />
                        ) : (
                          <div style={{
                            width: '100px',
                            height: '100px',
                            backgroundColor: '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            color: '#999',
                            fontSize: '12px'
                          }}>
                            No Formula
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 15px' }}>
                        <span style={{
                          backgroundColor: '#e8f5e9',
                          color: '#4B5320',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}>
                          {question.subject}
                        </span>
                      </td>
                      <td style={{ padding: '12px 15px' }}>
                        <span style={{
                          backgroundColor: '#fff8e1',
                          color: '#4B5320',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}>
                          {question.class}
                        </span>
                      </td>
                      <td style={{ padding: '12px 15px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handleEditQuestion(question)}
                            style={{
                              backgroundColor: '#FFD700',
                              color: '#4B5320',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{ marginRight: '5px' }}>✏️</span>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(question._id)}
                            style={{
                              backgroundColor: '#ff6b6b',
                              color: 'white',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{ marginRight: '5px' }}>🗑️</span>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {questions.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '15px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0', color: '#4B5320' }}>
            Showing {questions.filter(q => (!filterSubject || q.subject === filterSubject) && (!filterClass || q.class === filterClass)).length} of {questions.length} questions
          </p>
        </div>
      )}
    </div>
  );
};

export default ManageQuestions;