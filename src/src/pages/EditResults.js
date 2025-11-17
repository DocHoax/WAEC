import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const EditResults = () => {
  const [results, setResults] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingResultId, setEditingResultId] = useState(null);
  const [editScore, setEditScore] = useState(0);
  const [selectedTest, setSelectedTest] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTests();
    fetchResults();
  }, []);

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

  const fetchResults = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://waec-gfv0.onrender.com/api/results', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load results.');
    }
    setLoading(false);
  };

  const handleEdit = (result) => {
    setEditingResultId(result._id);
    setEditScore(result.score);
  };

  const handleSave = async (resultId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`https://waec-gfv0.onrender.com/api/results/${resultId}`, { score: Number(editScore) }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(results.map(r => r._id === resultId ? { ...r, score: Number(editScore) } : r));
      setSuccess('Result updated successfully.');
      setEditingResultId(null);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update result.');
    }
    setLoading(false);
  };

  const handleViewTestAnswers = async (test) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const resultsRes = await axios.get(`https://waec-gfv0.onrender.com/api/results/${test._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const detailedResults = await Promise.all(
        resultsRes.data.map(async (result) => {
          try {
            const detailRes = await axios.get(`https://waec-gfv0.onrender.com/api/results/details/${result._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            return { ...result, answers: detailRes.data.answers };
          } catch (err) {
            console.error('Error fetching details for result:', result._id, err.message);
            return { ...result, answers: [] };
          }
        })
      );
      setSelectedTest({ test, results: detailedResults });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load test results.');
    }
    setLoading(false);
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://waec-gfv0.onrender.com/api/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTests(tests.filter(t => t._id !== testId));
      setResults(results.filter(r => r.testId._id !== testId));
      setSuccess('Test deleted successfully.');
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete test.');
    }
    setLoading(false);
  };

  const closeTestAnswers = () => {
    setSelectedTest(null);
  };

  if (loading) return (
    <div style={{ 
      padding: '20px', 
      color: '#3498db', 
      backgroundColor: '#b8c2cc', 
      textAlign: 'center', 
      fontFamily: '"Fredoka", sans-serif', 
      fontSize: '16px', 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        Loading...
      </div>
    </div>
  );

  return (
    <div style={{ 
      fontFamily: '"Fredoka", sans-serif', 
      backgroundColor: '#b8c2cc', 
      minHeight: '100vh', 
      padding: '20px',
      animation: 'fadeIn 0.8s ease-in'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {error && (
          <div style={{ 
            backgroundColor: '#FFF3F3', 
            color: '#B22222', 
            borderLeft: '4px solid #B22222', 
            padding: '15px', 
            marginBottom: '20px', 
            borderRadius: '8px', 
            fontSize: '14px',
            animation: 'shake 0.5s ease-in-out'
          }}>
            Error: {error}
          </div>
        )}
        {success && (
          <div style={{ 
            backgroundColor: '#E6FFE6', 
            color: '#228B22', 
            borderLeft: '4px solid #228B22', 
            padding: '15px', 
            marginBottom: '20px', 
            borderRadius: '8px', 
            fontSize: '14px',
            animation: 'fadeInUp 0.6s ease-out'
          }}>
            Success: {success}
          </div>
        )}

        <div style={{ 
          backgroundColor: '#2c3e50', 
          color: '#FFFFFF', 
          padding: '20px', 
          borderRadius: '12px', 
          marginBottom: '25px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideDown 0.6s ease-out'
        }}>
          <h3 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            marginBottom: '5px'
          }}>
            Manage Tests & Results
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: '#bdc3c7',
            margin: 0
          }}>
            Review and manage test results and student performance
          </p>
        </div>

        <div style={{
          display: 'grid',
          gap: '25px',
          gridTemplateColumns: '1fr 1fr'
        }}>
          {/* Tests Section */}
          <div style={{ 
            backgroundColor: '#FFFFFF', 
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            animation: 'fadeInUp 0.6s ease-out 0.2s both',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #E0E0E0'
            }}>
              <h4 style={{ 
                fontSize: '18px', 
                color: '#2c3e50', 
                fontWeight: '600',
                margin: 0
              }}>
                Tests Management
              </h4>
            </div>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', fontSize: '12px' }}>
                    <th style={{ border: '1px solid #E0E0E0', padding: '12px', textAlign: 'left', fontWeight: '600' }}>Title</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '12px', textAlign: 'left', fontWeight: '600' }}>Subject</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '12px', textAlign: 'left', fontWeight: '600' }}>Class</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '12px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => (
                    <tr key={test._id} style={{ transition: 'background-color 0.2s ease' }}>
                      <td style={{ border: '1px solid #E0E0E0', padding: '12px', fontSize: '14px' }}>{test.title}</td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '12px', fontSize: '14px' }}>{test.subject}</td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '12px', fontSize: '14px' }}>{test.class}</td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '12px', display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleViewTestAnswers(test)}
                          style={{ 
                            color: '#FFFFFF', 
                            backgroundColor: '#3498db', 
                            fontSize: '12px', 
                            padding: '8px 12px', 
                            border: 'none', 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          View Results
                        </button>
                        <button
                          onClick={() => handleDeleteTest(test._id)}
                          style={{ 
                            color: '#FFFFFF', 
                            backgroundColor: '#B22222', 
                            fontSize: '12px', 
                            padding: '8px 12px', 
                            border: 'none', 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results Section */}
          <div style={{ 
            backgroundColor: '#FFFFFF', 
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            animation: 'fadeInUp 0.6s ease-out 0.4s both',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #E0E0E0'
            }}>
              <h4 style={{ 
                fontSize: '18px', 
                color: '#2c3e50', 
                fontWeight: '600',
                margin: 0
              }}>
                Results Management
              </h4>
            </div>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', fontSize: '12px' }}>
                    <th style={{ border: '1px solid #E0E0E0', padding: '12px', textAlign: 'left', fontWeight: '600' }}>Student</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '12px', textAlign: 'left', fontWeight: '600' }}>Test</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '12px', textAlign: 'left', fontWeight: '600' }}>Score</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '12px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result._id} style={{ transition: 'background-color 0.2s ease' }}>
                      <td style={{ border: '1px solid #E0E0E0', padding: '12px', fontSize: '14px' }}>
                        {result.userId ? `${result.userId.name} ${result.userId.surname}` : 'Unknown'}
                      </td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '12px', fontSize: '14px' }}>
                        {result.testId?.title || 'Unknown'}
                      </td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '12px', fontSize: '14px' }}>
                        {editingResultId === result._id ? (
                          <input
                            type="number"
                            value={editScore}
                            onChange={(e) => setEditScore(Number(e.target.value))}
                            min="0"
                            max="100"
                            style={{ 
                              padding: '8px', 
                              border: '1px solid #E0E0E0', 
                              borderRadius: '6px', 
                              width: '80px',
                              fontSize: '14px'
                            }}
                          />
                        ) : (
                          `${result.score}%`
                        )}
                      </td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '12px', display: 'flex', gap: '8px' }}>
                        {editingResultId === result._id ? (
                          <>
                            <button
                              onClick={() => handleSave(result._id)}
                              style={{ 
                                color: '#FFFFFF', 
                                backgroundColor: '#27ae60', 
                                fontSize: '12px', 
                                padding: '8px 12px', 
                                border: 'none', 
                                borderRadius: '6px', 
                                cursor: 'pointer',
                                fontWeight: '500',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingResultId(null)}
                              style={{ 
                                color: '#2c3e50', 
                                backgroundColor: '#ecf0f1', 
                                fontSize: '12px', 
                                padding: '8px 12px', 
                                border: 'none', 
                                borderRadius: '6px', 
                                cursor: 'pointer',
                                fontWeight: '500',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(result)}
                              style={{ 
                                color: '#FFFFFF', 
                                backgroundColor: '#3498db', 
                                fontSize: '12px', 
                                padding: '8px 12px', 
                                border: 'none', 
                                borderRadius: '6px', 
                                cursor: 'pointer',
                                fontWeight: '500',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleViewTestAnswers({ _id: result.testId._id, title: result.testId.title })}
                              style={{ 
                                color: '#FFFFFF', 
                                backgroundColor: '#2c3e50', 
                                fontSize: '12px', 
                                padding: '8px 12px', 
                                border: 'none', 
                                borderRadius: '6px', 
                                cursor: 'pointer',
                                fontWeight: '500',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              Review
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selectedTest && (
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
            animation: 'fadeIn 0.3s ease-in'
          }}>
            <div style={{ 
              backgroundColor: '#FFFFFF', 
              padding: '25px', 
              borderRadius: '12px', 
              maxWidth: '800px', 
              width: '90%', 
              maxHeight: '80vh', 
              overflowY: 'auto', 
              border: '1px solid #E0E0E0',
              boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
              animation: 'fadeInUp 0.4s ease-out'
            }}>
              <h3 style={{ 
                fontSize: '20px', 
                color: '#2c3e50', 
                marginBottom: '20px',
                fontWeight: '600'
              }}>
                Results for {selectedTest.test.title}
              </h3>
              {selectedTest.results.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#333' }}>No students have taken this test yet.</p>
              ) : (
                selectedTest.results.map((result) => (
                  <div key={result._id} style={{ 
                    marginBottom: '20px', 
                    padding: '15px', 
                    border: '1px solid #E0E0E0', 
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa'
                  }}>
                    <h4 style={{ 
                      fontSize: '16px', 
                      color: '#2c3e50', 
                      marginBottom: '10px',
                      fontWeight: '600'
                    }}>
                      {result.userId ? `${result.userId.name} ${result.userId.surname}` : 'Unknown'} (Score: {result.score}%)
                    </h4>
                    {Array.isArray(result.answers) && result.answers.length > 0 ? (
                      result.answers.map((answer, index) => (
                        <div key={index} style={{ 
                          marginBottom: '10px', 
                          padding: '12px', 
                          border: '1px solid #D3D3D3', 
                          borderRadius: '6px', 
                          backgroundColor: answer.isCorrect ? '#E6FFE6' : '#FFE6E6' 
                        }}>
                          <p style={{ fontSize: '14px', color: '#333', marginBottom: '5px', fontWeight: '500' }}>
                            <strong>Question {index + 1}:</strong> {answer.question || 'N/A'}
                          </p>
                          <p style={{ fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                            <strong>Selected Answer:</strong> {answer.selectedOption || 'N/A'}
                          </p>
                          <p style={{ fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                            <strong>Correct Answer:</strong> {answer.correctOption || 'N/A'}
                          </p>
                          <p style={{ fontSize: '14px', color: answer.isCorrect ? '#228B22' : '#B22222', fontWeight: '500' }}>
                            <strong>Status:</strong> {answer.isCorrect ? 'Correct' : 'Incorrect'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '14px', color: '#333' }}>No answers available for this result.</p>
                    )}
                  </div>
                ))
              )}
              <button
                onClick={closeTestAnswers}
                style={{ 
                  color: '#FFFFFF', 
                  backgroundColor: '#3498db', 
                  fontSize: '14px', 
                  padding: '10px 20px', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  marginTop: '15px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
const keyframes = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fadeInUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes slideDown {
  from { 
    opacity: 0;
    transform: translateY(-20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
`;

// Inject keyframes
if (styleSheet) {
  styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
}

// Add hover effects
const hoverStyles = `
  .management-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
  }
  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  tr:hover {
    background-color: #f8f9fa;
  }
`;

// Inject hover styles
if (styleSheet) {
  const hoverStyleElement = document.createElement('style');
  hoverStyleElement.textContent = hoverStyles;
  document.head.appendChild(hoverStyleElement);
}

export default EditResults;