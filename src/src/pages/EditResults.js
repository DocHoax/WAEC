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
      const res = await axios.get('http://localhost:5000/api/tests/admin', {
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
      const res = await axios.get('http://localhost:5000/api/results', {
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
      await axios.put(`http://localhost:5000/api/results/${resultId}`, { score: Number(editScore) }, {
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
      const resultsRes = await axios.get(`http://localhost:5000/api/results/${test._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const detailedResults = await Promise.all(
        resultsRes.data.map(async (result) => {
          try {
            const detailRes = await axios.get(`http://localhost:5000/api/results/details/${result._id}`, {
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
      await axios.delete(`http://localhost:5000/api/tests/${testId}`, {
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

  if (loading) return <p style={{ padding: '20px', color: '#FFFFFF', backgroundColor: '#4B5320', textAlign: 'center', fontFamily: 'sans-serif', fontSize: '16px' }}>Loading...</p>;

  return (
    <div>
      {error && <p style={{ backgroundColor: '#FFF3F3', color: '#B22222', borderLeft: '4px solid #B22222', padding: '15px', marginBottom: '20px', fontFamily: 'sans-serif', borderRadius: '4px', fontSize: '14px' }}>Error: {error}</p>}
      {success && <p style={{ backgroundColor: '#E6FFE6', color: '#228B22', borderLeft: '4px solid #228B22', padding: '15px', marginBottom: '20px', fontFamily: 'sans-serif', borderRadius: '4px', fontSize: '14px' }}>Success: {success}</p>}

      <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'sans-serif', backgroundColor: '#4B5320', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
        Manage Tests & Results
      </h3>
      <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E0E0E0' }}>
          <thead>
            <tr style={{ backgroundColor: '#4B5320', color: '#FFFFFF', fontFamily: 'sans-serif', fontSize: '12px' }}>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Test ID</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Title</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Subject</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Class</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Session</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Questions</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => (
              <tr key={test._id} style={{ color: '#000000', fontFamily: 'sans-serif', fontSize: '12px' }}>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{test._id}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{test.title}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{test.subject}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{test.class}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{test.session}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{test.questions.length}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px', display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => handleViewTestAnswers(test)}
                    style={{ color: '#000000', backgroundColor: '#D4A017', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    View Results
                  </button>
                  <button
                    onClick={() => handleDeleteTest(test._id)}
                    style={{ color: '#FFFFFF', backgroundColor: '#B22222', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Delete Test
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'sans-serif', backgroundColor: '#4B5320', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
        View Results
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E0E0E0' }}>
          <thead>
            <tr style={{ backgroundColor: '#4B5320', color: '#FFFFFF', fontFamily: 'sans-serif', fontSize: '12px' }}>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Student</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Test</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Subject</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Class</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Session</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Score</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result._id} style={{ color: '#000000', fontFamily: 'sans-serif', fontSize: '12px' }}>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{result.userId ? `${result.userId.name} ${result.userId.surname}` : 'Unknown'}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{result.testId?.title || 'Unknown'}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{result.subject || result.testId?.subject || 'Unknown'}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{result.class || result.testId?.class || 'Unknown'}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{result.session || 'Unknown'}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                  {editingResultId === result._id ? (
                    <input
                      type="number"
                      value={editScore}
                      onChange={(e) => setEditScore(Number(e.target.value))}
                      min="0"
                      style={{ padding: '5px', border: '1px solid #000000', borderRadius: '4px', width: '60px', fontFamily: 'sans-serif' }}
                    />
                  ) : (
                    `${result.score}%`
                  )}
                </td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px', display: 'flex', gap: '5px' }}>
                  {editingResultId === result._id ? (
                    <>
                      <button
                        onClick={() => handleSave(result._id)}
                        style={{ color: '#000000', backgroundColor: '#D4A017', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingResultId(null)}
                        style={{ color: '#000000', backgroundColor: '#FFFFFF', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(result)}
                        style={{ color: '#000000', backgroundColor: '#D4A017', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleViewTestAnswers({ _id: result.testId._id, title: result.testId.title })}
                        style={{ color: '#FFFFFF', backgroundColor: '#4B5320', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Review Answers
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTest && (
        <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', maxWidth: '800px', width: '90%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #E0E0E0' }}>
            <h3 style={{ fontSize: '20px', color: '#4B5320', fontFamily: 'sans-serif', marginBottom: '15px' }}>
              Results for {selectedTest.test.title}
            </h3>
            {selectedTest.results.length === 0 ? (
              <p style={{ fontFamily: 'sans-serif', fontSize: '14px', color: '#333' }}>No students have taken this test yet.</p>
            ) : (
              selectedTest.results.map((result) => (
                <div key={result._id} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #E0E0E0', borderRadius: '4px' }}>
                  <h4 style={{ fontFamily: 'sans-serif', fontSize: '16px', color: '#4B5320', marginBottom: '10px' }}>
                    {result.userId ? `${result.userId.name} ${result.userId.surname}` : 'Unknown'} (Score: {result.score}%)
                  </h4>
                  {Array.isArray(result.answers) && result.answers.length > 0 ? (
                    result.answers.map((answer, index) => (
                      <div key={index} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #D3D3D3', borderRadius: '4px', backgroundColor: answer.isCorrect ? '#E6FFE6' : '#FFE6E6' }}>
                        <p style={{ fontFamily: 'sans-serif', fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                          <strong>Question {index + 1}:</strong> {answer.question || 'N/A'}
                        </p>
                        <p style={{ fontFamily: 'sans-serif', fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                          <strong>Selected Answer:</strong> {answer.selectedOption || 'N/A'}
                        </p>
                        <p style={{ fontFamily: 'sans-serif', fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                          <strong>Correct Answer:</strong> {answer.correctOption || 'N/A'}
                        </p>
                        <p style={{ fontFamily: 'sans-serif', fontSize: '14px', color: answer.isCorrect ? '#228B22' : '#B22222' }}>
                          <strong>Status:</strong> {answer.isCorrect ? 'Correct' : 'Incorrect'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontFamily: 'sans-serif', fontSize: '14px', color: '#333' }}>No answers available for this result.</p>
                  )}
                </div>
              ))
            )}
            <button
              onClick={closeTestAnswers}
              style={{ color: '#000000', backgroundColor: '#D4A017', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditResults;