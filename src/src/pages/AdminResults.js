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
        const [testRes, resultsRes] = await Promise.all([
          axios.get(`https://waec-gfv0.onrender.com/api/tests/${testId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`https://waec-gfv0.onrender.com/api/tests/${testId}/results`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
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
      const res = await axios.put(
        `https://waec-gfv0.onrender.com/api/tests/results/${resultId}`,
        { score: Number(editScore), answers: editAnswers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
        fontFamily: '"Fredoka", sans-serif',
        backgroundColor: '#b8c2cc',
        minHeight: '100vh',
        textAlign: 'center'
      }}>
        <div style={{ 
          backgroundColor: '#FFF3F3', 
          padding: '30px', 
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          animation: 'fadeIn 0.8s ease-in'
        }}>
          Access restricted to admins.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        color: '#2c3e50',
        fontFamily: '"Fredoka", sans-serif',
        backgroundColor: '#b8c2cc',
        minHeight: '100vh',
        textAlign: 'center',
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
          Loading results...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        color: '#B22222',
        fontFamily: '"Fredoka", sans-serif',
        backgroundColor: '#b8c2cc',
        minHeight: '100vh',
        textAlign: 'center'
      }}>
        <div style={{ 
          backgroundColor: '#FFF3F3', 
          padding: '30px', 
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          animation: 'shake 0.5s ease-in-out'
        }}>
          Error: {error}
          <button
            onClick={() => navigate('/admin/tests')}
            style={{
              padding: '12px 20px',
              backgroundColor: '#3498db',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '15px',
              marginLeft: '15px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
          >
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#b8c2cc',
      padding: '20px',
      fontFamily: '"Fredoka", sans-serif',
      animation: 'fadeIn 0.8s ease-in'
    }}>
      <div style={{
        backgroundColor: '#2c3e50',
        color: '#FFFFFF',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '25px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        animation: 'slideDown 0.6s ease-out'
      }}>
        <h2 style={{ fontSize: '24px', marginBottom: '10px', fontWeight: 'bold' }}>
          Results for {test?.title || 'Test'} - {test?.subject || 'Subject'} ({test?.class || 'Class'})
        </h2>
        <p style={{ fontSize: '16px', color: '#bdc3c7', margin: 0 }}>
          Review and manage student performance
        </p>
      </div>
      
      {results.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '30px',
          borderRadius: '12px',
          border: '1px solid #E0E0E0',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          animation: 'fadeInUp 0.6s ease-out'
        }}>
          No results available for this test.
        </div>
      ) : (
        results.map((result, index) => (
          <div key={result._id} style={{
            backgroundColor: '#FFFFFF',
            padding: '25px',
            borderRadius: '12px',
            border: '1px solid #E0E0E0',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}>
            <h3 style={{ color: '#2c3e50', fontSize: '20px', marginBottom: '15px', fontWeight: '600' }}>
              Student: {result.userId?.username || 'Unknown'}
            </h3>
            {editingResult === result._id ? (
              <div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ color: '#2c3e50', marginRight: '10px', fontWeight: '600' }}>
                    Score:
                    <input
                      type="number"
                      value={editScore}
                      onChange={(e) => setEditScore(e.target.value)}
                      style={{
                        marginLeft: '10px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #E0E0E0',
                        fontSize: '14px'
                      }}
                    />
                  </label>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <h4 style={{ color: '#2c3e50', fontSize: '16px', fontWeight: '600' }}>Answers:</h4>
                  {Object.entries(editAnswers).map(([questionId, selectedAnswer], index) => {
                    const question = test?.questions?.find(q => q._id.toString() === questionId);
                    return (
                      <div key={index} style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                        <p style={{ color: '#2c3e50', fontWeight: '500' }}>Question: {question?.text || 'Unknown'}</p>
                        <select
                          value={selectedAnswer || ''}
                          onChange={(e) => setEditAnswers({ ...editAnswers, [questionId]: e.target.value })}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #E0E0E0',
                            marginTop: '5px',
                            fontSize: '14px'
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
                    padding: '12px 20px',
                    backgroundColor: '#3498db',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginRight: '10px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingResult(null)}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#B22222',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: '#2c3e50', fontSize: '16px', marginBottom: '10px' }}>
                  <strong>Score:</strong> {result.score} / {result.totalQuestions}
                </p>
                <p style={{ color: '#2c3e50', fontSize: '16px', marginBottom: '15px' }}>
                  <strong>Submitted:</strong> {new Date(result.submittedAt).toLocaleString()}
                </p>
                <div style={{ marginTop: '15px' }}>
                  <h4 style={{ color: '#2c3e50', fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>Answers:</h4>
                  {Object.entries(result.answers).map(([questionId, selectedAnswer], index) => {
                    const question = test?.questions?.find(q => q._id.toString() === questionId);
                    return (
                      <div key={index} style={{
                        padding: '15px',
                        backgroundColor: selectedAnswer === question?.correctAnswer ? '#d4edda' : '#f8d7da',
                        color: selectedAnswer === question?.correctAnswer ? '#155724' : '#721c24',
                        borderRadius: '8px',
                        marginTop: '10px',
                        border: `1px solid ${selectedAnswer === question?.correctAnswer ? '#c3e6cb' : '#f5c6cb'}`,
                        transition: 'transform 0.2s ease'
                      }}>
                        <p style={{ fontWeight: '600', marginBottom: '5px' }}>Question: {question?.text || 'Unknown'}</p>
                        <p style={{ marginBottom: '5px' }}>Your Answer: {selectedAnswer || 'None'}</p>
                        <p>Correct Answer: {question?.correctAnswer || 'Unknown'}</p>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleEdit(result)}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#3498db',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginTop: '15px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
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
  .result-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
  }
  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
`;

// Inject hover styles
if (styleSheet) {
  const hoverStyleElement = document.createElement('style');
  hoverStyleElement.textContent = hoverStyles;
  document.head.appendChild(hoverStyleElement);
}

export default AdminResults;