import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const AdminResults = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!testId || testId === 'undefined') {
      setError('Invalid test ID');
      setLoading(false);
      return;
    }
    const fetchResults = async () => {
      try {
        console.log('AdminResults - Fetching results:', { testId });
        const token = localStorage.getItem('token');
        const res = await fetch(`https://waec-gfv0.onrender.com/api/tests/${testId}/results`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch results');
        setResults(data);
        setLoading(false);
      } catch (err) {
        console.error('AdminResults - Fetch error:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchResults();
  }, [testId]);

  const handleEditResult = async (resultId, newScore, newAnswers, newCorrectness) => {
    try {
      console.log('AdminResults - Updating result:', { resultId, newScore });
      const token = localStorage.getItem('token');
      const res = await fetch(`https://waec-gfv0.onrender.com/api/tests/results/${resultId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score: newScore, answers: newAnswers, correctness: newCorrectness }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update result');
      setResults(results.map(r => (r._id === resultId ? data : r)));
      console.log('AdminResults - Update success:', { resultId });
    } catch (err) {
      console.error('AdminResults - Update error:', err.message);
      setError(err.message);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#B22222' }}>
        Error: {error}
        <button onClick={() => navigate('/admin/tests')} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Back to Tests
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', fontFamily: "'Roboto', sans-serif" }}>
      <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Test Results</h2>
      {results.length === 0 ? (
        <p>No results found for this test.</p>
      ) : (
        results.map(result => (
          <div key={result._id} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #E0E0E0', borderRadius: '6px' }}>
            <p>Student: {result.userId.name} ({result.userId.username})</p>
            <p>Score: {result.score}/{result.totalQuestions}</p>
            <p>Submitted: {new Date(result.submittedAt).toLocaleString()}</p>
            <div>
              <h3>Answers:</h3>
              {Object.entries(result.answers).map(([qId, answer]) => (
                <p key={qId}>
                  Question {qId}: {answer} ({result.correctness[qId] ? 'Correct' : 'Incorrect'})
                </p>
              ))}
            </div>
            <button
              onClick={() => {
                // Example: Edit score (implement form for editing answers/correctness)
                handleEditResult(result._id, result.score + 1, result.answers, result.correctness);
              }}
              style={{ padding: '10px 20px', marginTop: '10px', backgroundColor: '#D4A017', color: '#FFFFFF', border: 'none', borderRadius: '6px' }}
            >
              Increment Score (Demo)
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminResults;