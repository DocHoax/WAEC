import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const Results = () => {
  const { user } = useContext(AuthContext);
  const { testId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingResultId, setEditingResultId] = useState(null);
  const [editScore, setEditScore] = useState(0);
  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        setLoading(false);
        return;
      }

      try {
        const [testRes, resultsRes] = await Promise.all([
          axios.get(`https://waec-gfv0.onrender.com/api/tests/${testId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`https://waec-gfv0.onrender.com/api/tests/${testId}/results`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        console.log('Results - Fetched test:', testRes.data);
        console.log('Results - Fetched results:', resultsRes.data);
        setTest(testRes.data);
        setResults(resultsRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Results - Error:', error.response?.data || error.message);
        setError(error.response?.data?.error || 'Failed to load results');
        setLoading(false);
      }
    };

    if (user && ['admin', 'teacher'].includes(user.role)) {
      fetchResults();
    } else {
      setError('Access restricted to admins or teachers.');
      setLoading(false);
    }
  }, [testId, user, navigate]);

  const handleEdit = (result) => {
    setEditingResultId(result._id);
    setEditScore(result.score);
  };

  const handleSave = async (resultId) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.put(
        `https://waec-gfv0.onrender.com/api/tests/results/${resultId}`,
        { score: Number(editScore) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Results - Result updated:', response.data);
      setResults(
        results.map((r) =>
          r._id === resultId ? { ...r, score: Number(editScore) } : r
        )
      );
      setSuccess('Result updated successfully.');
      setEditingResultId(null);
      setError(null);
    } catch (error) {
      console.error('Results - Update error:', error.response?.data || error.message);
      setError(error.response?.data?.error || 'Failed to update result');
    }
    setLoading(false);
  };

  const handleViewAnswers = (result) => {
    setSelectedResult({ ...result, answers: result.answers, test });
  };

  const closeAnswers = () => {
    setSelectedResult(null);
  };

  if (!user || !['admin', 'teacher'].includes(user.role)) {
    return (
      <div style={{
        padding: '20px',
        color: '#D4A017',
        backgroundColor: '#b8c2cc',
        textAlign: 'center',
        fontFamily: '"Fredoka", sans-serif',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          animation: 'fadeIn 0.6s ease-out'
        }}>
          Access restricted to admins or teachers.
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{
      padding: '20px',
      color: '#D4A017',
      backgroundColor: '#b8c2cc',
      textAlign: 'center',
      fontFamily: '"Fredoka", sans-serif',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        Loading...
      </div>
    </div>
  );
  if (error) return (
    <div style={{
      backgroundColor: 'rgba(255, 230, 230, 0.9)',
      color: '#B22222',
      borderLeft: '4px solid #B22222',
      padding: '15px',
      margin: '20px',
      fontFamily: '"Fredoka", sans-serif',
      borderRadius: '8px',
      animation: 'shake 0.5s ease-in-out'
    }}>
      Error: {error}
    </div>
  );
  if (!test) return (
    <div style={{
      padding: '20px',
      color: '#4B5320',
      fontFamily: '"Fredoka", sans-serif',
      textAlign: 'center',
      backgroundColor: '#b8c2cc',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        Test not found.
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#b8c2cc',
      padding: '20px',
      fontFamily: '"Fredoka", sans-serif',
      animation: 'slideIn 0.5s ease-out'
    }}>
      <header style={{
        backgroundColor: '#4B5320',
        color: '#D4A017',
        padding: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '2rem',
        borderRadius: '8px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img 
              src="/uploads/sanni.png" 
              alt="Sanniville Academy" 
              style={{ height: '48px', border: '2px solid #D4A017', padding: '4px', backgroundColor: '#FFFFFF', borderRadius: '4px' }}
            />
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: '"Fredoka", sans-serif' }}>Sanniville Academy</h1>
              <span style={{ fontSize: '14px', fontFamily: '"Fredoka", sans-serif', color: '#F0E68C' }}>Test Results</span>
            </div>
          </div>
          <button 
            onClick={() => navigate(user.role === 'admin' ? '/admin' : '/teacher')} 
            style={{
              padding: '8px 16px',
              backgroundColor: '#D4A017',
              color: '#4B5320',
              border: 'none',
              borderRadius: '4px',
              fontFamily: '"Fredoka", sans-serif',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {success && (
          <div style={{
            backgroundColor: 'rgba(230, 255, 230, 0.9)',
            color: '#228B22',
            borderLeft: '4px solid #228B22',
            padding: '15px',
            marginBottom: '20px',
            fontFamily: '"Fredoka", sans-serif',
            borderRadius: '8px',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            Success: {success}
          </div>
        )}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
          animation: 'slideUp 0.5s ease-out'
        }}>
          <h2 style={{
            fontSize: '24px',
            color: '#4B5320',
            fontFamily: '"Fredoka", sans-serif',
            marginBottom: '10px'
          }}>
            Results for {test.title} ({test.subject}/{test.class})
          </h2>
          <p style={{ color: '#333', fontFamily: '"Fredoka", sans-serif', marginBottom: '20px' }}>
            Total Questions: {test.questions?.length || 'N/A'}
          </p>
        </div>
        {results.length === 0 ? (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            textAlign: 'center',
            animation: 'fadeIn 0.6s ease-out'
          }}>
            <p style={{ color: '#4B5320', fontFamily: '"Fredoka", sans-serif' }}>No students have taken this test yet.</p>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '1px solid #D3D3D3',
            animation: 'slideUp 0.5s ease-out'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #D3D3D3',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#4B5320', color: '#D4A017', fontFamily: '"Fredoka", sans-serif', fontSize: '14px' }}>
                  <th style={{ border: '1px solid #D3D3D3', padding: '12px' }}>Student</th>
                  <th style={{ border: '1px solid #D3D3D3', padding: '12px' }}>Score</th>
                  <th style={{ border: '1px solid #D3D3D3', padding: '12px' }}>Total</th>
                  <th style={{ border: '1px solid #D3D3D3', padding: '12px' }}>Details</th>
                  {user.role === 'admin' && <th style={{ border: '1px solid #D3D3D3', padding: '12px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={result._id} style={{
                    color: '#333',
                    fontFamily: '"Fredoka", sans-serif',
                    fontSize: '14px',
                    animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                    transition: 'background-color 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                  }}>
                    <td style={{ border: '1px solid #D3D3D3', padding: '12px' }}>{result.userId?.name ? `${result.userId.name} ${result.userId.surname}` : 'Unknown'}</td>
                    <td style={{ border: '1px solid #D3D3D3', padding: '12px' }}>
                      {editingResultId === result._id && user.role === 'admin' ? (
                        <input
                          type="number"
                          value={editScore}
                          onChange={(e) => setEditScore(Number(e.target.value))}
                          min="0"
                          max={test.questions?.length || 100}
                          style={{
                            padding: '8px',
                            border: '1px solid #D3D3D3',
                            borderRadius: '4px',
                            width: '80px',
                            fontFamily: '"Fredoka", sans-serif'
                          }}
                        />
                      ) : (
                        `${result.score}%`
                      )}
                    </td>
                    <td style={{ border: '1px solid #D3D3D3', padding: '12px' }}>{test.questions?.length || 'N/A'}</td>
                    <td style={{ border: '1px solid #D3D3D3', padding: '12px' }}>
                      <button
                        onClick={() => handleViewAnswers(result)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#D4A017',
                          color: '#4B5320',
                          border: 'none',
                          borderRadius: '4px',
                          fontFamily: '"Fredoka", sans-serif',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.05)';
                          e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        View Answers
                      </button>
                    </td>
                    {user.role === 'admin' && (
                      <td style={{ border: '1px solid #D3D3D3', padding: '12px', display: 'flex', gap: '8px' }}>
                        {editingResultId === result._id ? (
                          <>
                            <button
                              onClick={() => handleSave(result._id)}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: '#D4A017',
                                color: '#4B5320',
                                border: 'none',
                                borderRadius: '4px',
                                fontFamily: '"Fredoka", sans-serif',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'scale(1.05)';
                                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingResultId(null)}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: '#D3D3D3',
                                color: '#333',
                                border: 'none',
                                borderRadius: '4px',
                                fontFamily: '"Fredoka", sans-serif',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'scale(1.05)';
                                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEdit(result)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#D4A017',
                              color: '#4B5320',
                              border: 'none',
                              borderRadius: '4px',
                              fontFamily: '"Fredoka", sans-serif',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.05)';
                              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1)';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedResult && (
          <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              border: '1px solid #D3D3D3',
              animation: 'slideUp 0.3s ease-out'
            }}>
              <h3 style={{
                fontSize: '20px',
                color: '#4B5320',
                fontFamily: '"Fredoka", sans-serif',
                marginBottom: '15px'
              }}>
                Answers for {selectedResult.userId?.name ? `${selectedResult.userId.name} ${selectedResult.userId.surname}` : 'Unknown'}
              </h3>
              {Object.entries(selectedResult.answers).map(([questionId, selectedAnswer], index) => {
                const question = selectedResult.test?.questions.find(q => q._id.toString() === questionId);
                return (
                  <div key={index} style={{
                    marginBottom: '15px',
                    padding: '15px',
                    border: '1px solid #D3D3D3',
                    borderRadius: '8px',
                    backgroundColor: selectedAnswer === question?.correctAnswer ? 'rgba(230, 255, 230, 0.9)' : 'rgba(255, 230, 230, 0.9)',
                    animation: 'fadeIn 0.5s ease-out',
                    transition: 'transform 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                    <p style={{ fontFamily: '"Fredoka", sans-serif', fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                      <strong>Question {index + 1}:</strong> {question?.text || 'N/A'}
                    </p>
                    <p style={{ fontFamily: '"Fredoka", sans-serif', fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                      <strong>Selected Answer:</strong> {selectedAnswer || 'N/A'}
                    </p>
                    <p style={{ fontFamily: '"Fredoka", sans-serif', fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                      <strong>Correct Answer:</strong> {question?.correctAnswer || 'N/A'}
                    </p>
                    <p style={{ fontFamily: '"Fredoka", sans-serif', fontSize: '14px', color: selectedAnswer === question?.correctAnswer ? '#228B22' : '#B22222' }}>
                      <strong>Status:</strong> {selectedAnswer === question?.correctAnswer ? 'Correct' : 'Incorrect'}
                    </p>
                  </div>
                );
              })}
              <button
                onClick={closeAnswers}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#D4A017',
                  color: '#4B5320',
                  border: 'none',
                  borderRadius: '6px',
                  fontFamily: '"Fredoka", sans-serif',
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginTop: '15px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      <style>
        {`
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
        `}
      </style>
    </div>
  );
};

export default Results;