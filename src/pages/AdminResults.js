import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const AdminResults = () => {
  const { testId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingResult, setEditingResult] = useState(null);
  const [editScore, setEditScore] = useState('');
  const [editAnswers, setEditAnswers] = useState({});

  useEffect(() => {
    const fetchResults = async () => {
      if (!user || user.role !== 'admin') {
        setError('Access restricted to admins.');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        navigate('/login');
        return;
      }

      if (!testId || testId === 'undefined') {
        setError('Please select a test to view results.');
        setLoading(false);
        navigate('/admin/tests');
        return;
      }

      try {
        console.log('AdminResults - Fetching results:', { testId });
        const [testRes, resultsRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/tests/${testId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`http://localhost:5000/api/tests/${testId}/results`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        console.log('AdminResults - Fetched test:', testRes.data);
        console.log('AdminResults - Fetched results:', resultsRes.data);
        setTest(testRes.data);
        setResults(resultsRes.data);
        setError(null);
      } catch (err) {
        console.error('AdminResults - Error:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to load results.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [testId, user, navigate]);

  const handleEdit = (result) => {
    setEditingResult(result._id);
    setEditScore(result.score);
    setEditAnswers(result.answers);
  };

  const handleSave = async (resultId) => {
    const token = localStorage.getItem('token');
    try {
      console.log('AdminResults - Updating result:', { resultId, score: Number(editScore) });
      const res = await axios.put(
        `http://localhost:5000/api/tests/results/${resultId}`,
        { score: Number(editScore), answers: editAnswers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('AdminResults - Result updated:', res.data);
      setResults(results.map(r => (r._id === resultId ? res.data : r)));
      setEditingResult(null);
      setError(null);
    } catch (err) {
      console.error('AdminResults - Update error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to update result.');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div style={{
        padding: '20px',
        color: '#B22222',
        fontFamily: 'sans-serif',
        backgroundColor: '#FFF3F3',
        minHeight: '100vh',
        textAlign: 'center'
      }}>
        Access restricted to admins.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        color: '#4B5320',
        fontFamily: 'sans-serif',
        backgroundColor: '#F8F9FA',
        minHeight: '100vh',
        textAlign: 'center'
      }}>
        Loading results...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        color: '#B22222',
        fontFamily: 'sans-serif',
        backgroundColor: '#FFF3F3',
        minHeight: '100vh',
        textAlign: 'center'
      }}>
        Error: {error}
        <button
          onClick={() => navigate('/admin/tests')}
          style={{
            padding: '10px',
            backgroundColor: '#D4A017',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Back to Tests
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8F9FA',
      padding: '20px',
      fontFamily: 'sans-serif'
    }}>
      <h2 style={{ color: '#4B5320', fontSize: '24px', marginBottom: '20px' }}>
        Results for {test?.title || 'Test'} - {test?.subject || 'Subject'} ({test?.class || 'Class'})
      </h2>
      {results.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '20px',
          borderRadius: '6px',
          border: '1px solid #E0E0E0',
          textAlign: 'center'
        }}>
          No results available for this test.
        </div>
      ) : (
        results.map(result => (
          <div key={result._id} style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: '6px',
            border: '1px solid #E0E0E0',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#4B5320', fontSize: '18px', marginBottom: '10px' }}>
              Student: {result.userId?.username || 'Unknown'}
            </h3>
            {editingResult === result._id ? (
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ color: '#4B5320', marginRight: '10px' }}>
                    Score:
                    <input
                      type="number"
                      value={editScore}
                      onChange={(e) => setEditScore(e.target.value)}
                      style={{
                        marginLeft: '10px',
                        padding: '5px',
                        borderRadius: '4px',
                        border: '1px solid #E0E0E0'
                      }}
                    />
                  </label>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <h4 style={{ color: '#4B5320', fontSize: '16px' }}>Answers:</h4>
                  {Object.entries(editAnswers).map(([questionId, selectedAnswer], index) => {
                    const question = test?.questions?.find(q => q._id.toString() === questionId);
                    return (
                      <div key={index} style={{ marginTop: '5px' }}>
                        <p style={{ color: '#4B5320' }}>Question: {question?.text || 'Unknown'}</p>
                        <select
                          value={selectedAnswer || ''}
                          onChange={(e) => setEditAnswers({ ...editAnswers, [questionId]: e.target.value })}
                          style={{
                            padding: '5px',
                            borderRadius: '4px',
                            border: '1px solid #E0E0E0'
                          }}
                        >
                          <option value="">None</option>
                          {question?.options?.map((option, i) => (
                            <option key={i} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleSave(result._id)}
                  style={{
                    padding: '10px',
                    backgroundColor: '#D4A017',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '10px'
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingResult(null)}
                  style={{
                    padding: '10px',
                    backgroundColor: '#B22222',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: '#4B5320' }}>
                  Score: {result.score} / {result.totalQuestions}
                </p>
                <p style={{ color: '#4B5320' }}>
                  Submitted: {new Date(result.submittedAt).toLocaleString()}
                </p>
                <div style={{ marginTop: '10px' }}>
                  <h4 style={{ color: '#4B5320', fontSize: '16px' }}>Answers:</h4>
                  {Object.entries(result.answers).map(([questionId, selectedAnswer], index) => {
                    const question = test?.questions?.find(q => q._id.toString() === questionId);
                    return (
                      <div key={index} style={{
                        padding: '10px',
                        backgroundColor: selectedAnswer === question?.correctAnswer ? '#D4A017' : '#FFF3F3',
                        color: selectedAnswer === question?.correctAnswer ? '#FFFFFF' : '#B22222',
                        borderRadius: '4px',
                        marginTop: '5px'
                      }}>
                        <p>Question: {question?.text || 'Unknown'}</p>
                        <p>Your Answer: {selectedAnswer || 'None'}</p>
                        <p>Correct Answer: {question?.correctAnswer || 'Unknown'}</p>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleEdit(result)}
                  style={{
                    padding: '10px',
                    backgroundColor: '#D4A017',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '10px'
                  }}
                >
                  Edit Result
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default AdminResults;