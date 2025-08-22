import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { FiDownload, FiSearch, FiArrowUp, FiArrowDown, FiChevronDown, FiChevronUp, FiArrowLeft } from 'react-icons/fi';

const TestResults = () => {
  const { testId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedResult, setExpandedResult] = useState(null);
  const resultsPerPage = 10;

  useEffect(() => {
    const fetchResults = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        navigate('/login');
        return;
      }
      try {
        const [testRes, resultsRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/tests/${testId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`http://localhost:5000/api/tests/${testId}/results`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        console.log('TestResults - Fetched test:', testRes.data);
        console.log('TestResults - Fetched results:', resultsRes.data);
        setTest(testRes.data);
        setResults(resultsRes.data);
        setLoading(false);
      } catch (err) {
        console.error('TestResults - Error:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to load results. Please try again.');
        setLoading(false);
      }
    };

    if (user && (user.role === 'teacher' || user.role === 'admin')) {
      fetchResults();
    } else {
      setError('Access restricted to teachers or admins.');
      setLoading(false);
    }
  }, [testId, user, navigate]);

  const filteredResults = useMemo(() => {
    return results
      .filter(result => 
        (result.userId.name || result.userId.username || '')
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const fieldA = sortField === 'score' ? a.score : new Date(a.submittedAt);
        const fieldB = sortField === 'score' ? b.score : new Date(b.submittedAt);
        return sortOrder === 'asc' ? fieldA - fieldB : fieldB - fieldA;
      });
  }, [results, search, sortField, sortOrder]);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * resultsPerPage;
    return filteredResults.slice(start, start + resultsPerPage);
  }, [filteredResults, currentPage]);

  const totalPages = Math.ceil(filteredResults.length / resultsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleDetails = (resultId) => {
    setExpandedResult(expandedResult === resultId ? null : resultId);
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Username', 'Score', 'Total Questions', 'Submitted At'];
    const rows = results.map(result => [
      result.userId.name || result.userId.username,
      result.userId.username,
      result.score,
      result.totalQuestions,
      new Date(result.submittedAt).toLocaleString(),
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${test?.title || 'test'}_results.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          fontSize: '16px',
          color: '#4B5320',
        }}>
          Loading results...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          backgroundColor: '#FFF3F3',
          color: '#B22222',
          padding: '15px',
          borderRadius: '4px',
          borderLeft: '4px solid #B22222',
        }}>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '20px',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '16px',
        }}>
          <button
            onClick={() => navigate('/teacher')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#4B5320',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            <FiArrowLeft /> Back to Dashboard
          </button>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#4B5320',
            margin: '0',
          }}>
            Results for {test?.title} - {test?.subject} ({test?.class})
          </h2>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <div style={{
            position: 'relative',
            width: '300px',
          }}>
            <input
              type="text"
              placeholder="Search by student name or username"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 32px 8px 36px',
                border: '1px solid #E0E0E0',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            />
            <FiSearch style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#4B5320',
              fontSize: '16px',
            }} />
          </div>
          <button
            onClick={exportToCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#4B5320',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            <FiDownload /> Export to CSV
          </button>
        </div>
        {paginatedResults.length === 0 ? (
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: '6px',
            border: '1px solid #E0E0E0',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            No results available for this test.
          </div>
        ) : (
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '6px',
            border: '1px solid #E0E0E0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#4B5320',
                    borderBottom: '1px solid #E0E0E0',
                  }}>
                    Student
                  </th>
                  <th
                    onClick={() => handleSort('score')}
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#4B5320',
                      borderBottom: '1px solid #E0E0E0',
                      cursor: 'pointer',
                    }}
                  >
                    Score {sortField === 'score' && (sortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                  </th>
                  <th
                    onClick={() => handleSort('submittedAt')}
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#4B5320',
                      borderBottom: '1px solid #E0E0E0',
                      cursor: 'pointer',
                    }}
                  >
                    Submitted {sortField === 'submittedAt' && (sortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                  </th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#4B5320',
                    borderBottom: '1px solid #E0E0E0',
                  }}>
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedResults.map(result => (
                  <React.Fragment key={result._id}>
                    <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                      <td style={{ padding: '12px', color: '#4B5320', fontSize: '14px' }}>
                        {result.userId.name || result.userId.username} ({result.userId.username})
                      </td>
                      <td style={{ padding: '12px', color: '#4B5320', fontSize: '14px' }}>
                        {result.score} / {result.totalQuestions}
                      </td>
                      <td style={{ padding: '12px', color: '#4B5320', fontSize: '14px' }}>
                        {new Date(result.submittedAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => toggleDetails(result._id)}
                          style={{
                            color: '#4B5320',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '14px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {expandedResult === result._id ? <FiChevronUp /> : <FiChevronDown />}
                          View Details
                        </button>
                      </td>
                    </tr>
                    {expandedResult === result._id && (
                      <tr>
                        <td colSpan="4" style={{ padding: '0' }}>
                          <div style={{
                            padding: '12px',
                            backgroundColor: '#f8f9fa',
                          }}>
                            <h4 style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#4B5320',
                              marginBottom: '8px',
                            }}>
                              Answers:
                            </h4>
                            {Object.entries(result.answers).map(([questionId, selectedAnswer], index) => {
                              const question = test?.questions.find(q => q._id.toString() === questionId);
                              return (
                                <div key={index} style={{
                                  padding: '10px',
                                  backgroundColor: selectedAnswer === question?.correctAnswer ? '#D4A017' : '#FFF3F3',
                                  color: selectedAnswer === question?.correctAnswer ? '#FFFFFF' : '#B22222',
                                  borderRadius: '4px',
                                  marginTop: '5px',
                                }}>
                                  <p style={{ margin: '0', fontSize: '14px' }}>
                                    Question: {question?.text || 'Question not found'}
                                  </p>
                                  <p style={{ margin: '0', fontSize: '14px' }}>
                                    Your Answer: {selectedAnswer || 'None'}
                                  </p>
                                  <p style={{ margin: '0', fontSize: '14px' }}>
                                    Correct Answer: {question?.correctAnswer || 'N/A'}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
            }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentPage === 1 ? '#E0E0E0' : '#f8f9fa',
                  border: '1px solid #E0E0E0',
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  color: '#4B5320',
                }}
              >
                Previous
              </button>
              <span style={{ color: '#4B5320', fontSize: '14px' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentPage === totalPages ? '#E0E0E0' : '#f8f9fa',
                  border: '1px solid #E0E0E0',
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  color: '#4B5320',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestResults;