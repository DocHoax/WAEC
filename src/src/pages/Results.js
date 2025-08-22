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
          axios.get(`http://localhost:5000/api/tests/${testId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`http://localhost:5000/api/tests/${testId}/results`, {
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
        `http://localhost:5000/api/tests/results/${resultId}`,
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
    return <p style={{ padding: '20px', color: '#D4A017', backgroundColor: '#4B5320', textAlign: 'center', fontFamily: 'sans-serif' }}>Access restricted to admins or teachers.</p>;
  }

  if (loading) return <p style={{ padding: '20px', color: '#D4A017', backgroundColor: '#4B5320', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading...</p>;
  if (error) return <p style={{ backgroundColor: '#FFE6E6', color: '#B22222', borderLeft: '4px solid #B22222', padding: '10px', margin: '20px', fontFamily: 'sans-serif' }}>Error: {error}</p>;
  if (!test) return <p style={{ padding: '20px', color: '#4B5320', fontFamily: 'sans-serif', textAlign: 'center' }}>Test not found.</p>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F5F5', padding: '20px' }}>
      <header style={{ backgroundColor: '#4B5320', color: '#D4A017', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img 
              src="/images/sanni.png" 
              alt="Sanniville Academy" 
              style={{ height: '48px', border: '2px solid #D4A017', padding: '4px', backgroundColor: '#FFFFFF', borderRadius: '4px' }}
            />
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'sans-serif' }}>Sanniville Academy</h1>
              <span style={{ fontSize: '14px', fontFamily: 'sans-serif', color: '#F0E68C' }}>Test Results</span>
            </div>
          </div>
          <button 
            onClick={() => navigate(user.role === 'admin' ? '/admin' : '/teacher')} 
            style={{ padding: '8px 16px', backgroundColor: '#D4A017', color: '#4B5320', border: 'none', borderRadius: '4px', fontFamily: 'sans-serif', fontSize: '14px', cursor: 'pointer' }}
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {success && (
          <p style={{ backgroundColor: '#E6FFE6', color: '#228B22', borderLeft: '4px solid #228B22', padding: '10px', marginBottom: '20px', fontFamily: 'sans-serif' }}>
            Success: {success}
          </p>
        )}
        <h2 style={{ fontSize: '24px', color: '#4B5320', fontFamily: 'sans-serif', marginBottom: '10px' }}>
          Results for {test.title} ({test.subject}/{test.class})
        </h2>
        <p style={{ color: '#333', fontFamily: 'sans-serif', marginBottom: '20px' }}>
          Total Questions: {test.questions?.length || 'N/A'}
        </p>
        {results.length === 0 ? (
          <p style={{ color: '#4B5320', fontFamily: 'sans-serif' }}>No students have taken this test yet.</p>
        ) : (
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #D3D3D3' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #D3D3D3' }}>
              <thead>
                <tr style={{ backgroundColor: '#4B5320', color: '#D4A017', fontFamily: 'sans-serif', fontSize: '14px' }}>
                  <th style={{ border: '1px solid #D3D3D3', padding: '8px' }}>Student</th>
                  <th style={{ border: '1px solid #D3D3D3', padding: '8px' }}>Score</th>
                  <th style={{ border: '1px solid #D3D3D3', padding: '8px' }}>Total</th>
                  <th style={{ border: '1px solid #D3D3D3', padding: '8px' }}>Details</th>
                  {user.role === 'admin' && <th style={{ border: '1px solid #D3D3D3', padding: '8px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result._id} style={{ color: '#333', fontFamily: 'sans-serif', fontSize: '14px' }}>
                    <td style={{ border: '1px solid #D3D3D3', padding: '8px' }}>{result.userId?.name ? `${result.userId.name} ${result.userId.surname}` : 'Unknown'}</td>
                    <td style={{ border: '1px solid #D3D3D3', padding: '8px' }}>
                      {editingResultId === result._id && user.role === 'admin' ? (
                        <input
                          type="number"
                          value={editScore}
                          onChange={(e) => setEditScore(Number(e.target.value))}
                          min="0"
                          max={test.questions?.length || 100}
                          style={{ padding: '5px', border: '1px solid #D3D3D3', borderRadius: '4px', width: '60px', fontFamily: 'sans-serif' }}
                        />
                      ) : (
                        `${result.score}%`
                      )}
                    </td>
                    <td style={{ border: '1px solid #D3D3D3', padding: '8px' }}>{test.questions?.length || 'N/A'}</td>
                    <td style={{ border: '1px solid #D3D3D3', padding: '8px' }}>
                      <button
                        onClick={() => handleViewAnswers(result)}
                        style={{ padding: '5px 10px', backgroundColor: '#D4A017', color: '#4B5320', border: 'none', borderRadius: '4px', fontFamily: 'sans-serif', fontSize: '12px', cursor: 'pointer' }}
                      >
                        View Answers
                      </button>
                    </td>
                    {user.role === 'admin' && (
                      <td style={{ border: '1px solid #D3D3D3', padding: '8px', display: 'flex', gap: '5px' }}>
                        {editingResultId === result._id ? (
                          <>
                            <button
                              onClick={() => handleSave(result._id)}
                              style={{ padding: '5px 10px', backgroundColor: '#D4A017', color: '#4B5320', border: 'none', borderRadius: '4px', fontFamily: 'sans-serif', fontSize: '12px', cursor: 'pointer' }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingResultId(null)}
                              style={{ padding: '5px 10px', backgroundColor: '#D3D3D3', color: '#333', border: 'none', borderRadius: '4px', fontFamily: 'sans-serif', fontSize: '12px', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEdit(result)}
                            style={{ padding: '5px 10px', backgroundColor: '#D4A017', color: '#4B5320', border: 'none', borderRadius: '4px', fontFamily: 'sans-serif', fontSize: '12px', cursor: 'pointer' }}
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
          <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #D3D3D3' }}>
              <h3 style={{ fontSize: '20px', color: '#4B5320', fontFamily: 'sans-serif', marginBottom: '15px' }}>
                Answers for {selectedResult.userId?.name ? `${selectedResult.userId.name} ${selectedResult.userId.surname}` : 'Unknown'}
              </h3>
              {Object.entries(selectedResult.answers).map(([questionId, selectedAnswer], index) => {
                const question = selectedResult.test?.questions.find(q => q._id.toString() === questionId);
                return (
                  <div key={index} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #D3D3D3', borderRadius: '4px', backgroundColor: selectedAnswer === question?.correctAnswer ? '#E6FFE6' : '#FFE6E6' }}>
                    <p style={{ fontFamily: 'sans-serif', fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                      <strong>Question {index + 1}:</strong> {question?.text || 'N/A'}
                    </p>
                    <p style={{ fontFamily: 'sans-serif', fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                      <strong>Selected Answer:</strong> {selectedAnswer || 'N/A'}
                    </p>
                    <p style={{ fontFamily: 'sans-serif', fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                      <strong>Correct Answer:</strong> {question?.correctAnswer || 'N/A'}
                    </p>
                    <p style={{ fontFamily: 'sans-serif', fontSize: '14px', color: selectedAnswer === question?.correctAnswer ? '#228B22' : '#B22222' }}>
                      <strong>Status:</strong> {selectedAnswer === question?.correctAnswer ? 'Correct' : 'Incorrect'}
                    </p>
                  </div>
                );
              })}
              <button
                onClick={closeAnswers}
                style={{ padding: '8px 16px', backgroundColor: '#D4A017', color: '#4B5320', border: 'none', borderRadius: '4px', fontFamily: 'sans-serif', fontSize: '14px', cursor: 'pointer', marginTop: '10px' }}
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

export default Results;