// pages/editresults.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useResultEditing } from '../hooks/useResultEditing';
import ResultScoreEditor from '../components/ResultScoreEditor';

const EditResults = () => {
  const [results, setResults] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const navigate = useNavigate();

  // Use the reusable editing hook
  const {
    editingResultId,
    editScore,
    setEditScore,
    loading: editingLoading,
    error: editingError,
    success: editingSuccess,
    setError: setEditingError,
    setSuccess: setEditingSuccess,
    startEditing,
    cancelEditing,
    saveScore
  } = useResultEditing();

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
      setEditingError(null);
    } catch (err) {
      setEditingError(err.response?.data?.error || 'Failed to load tests.');
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
      setEditingError(null);
    } catch (err) {
      setEditingError(err.response?.data?.error || 'Failed to load results.');
    }
    setLoading(false);
  };

  const handleSaveScore = async (resultId) => {
    await saveScore(resultId, (updatedResultId, newScore) => {
      // Update local state after successful save
      setResults(results.map(r => 
        r._id === updatedResultId ? { ...r, score: newScore } : r
      ));
    });
  };

  const handleViewTestAnswers = async (test) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const resultsRes = await axios.get(`https://waec-gfv0.onrender.com/api/results/test/${test._id}`, { // FIXED API URL
        headers: { Authorization: `Bearer ${token}` },
      });
      const detailedResults = await Promise.all(
        resultsRes.data.results.map(async (result) => {
          try {
            const detailRes = await axios.get(`https://waec-gfv0.onrender.com/api/results/details/${result._id}`, { // FIXED API URL
              headers: { Authorization: `Bearer ${token}` },
            });
            return { ...result, answers: detailRes.data.questionAnalysis };
          } catch (err) {
            console.error('Error fetching details for result:', result._id, err.message);
            return { ...result, answers: [] };
          }
        })
      );
      setSelectedTest({ test, results: detailedResults });
      setEditingError(null);
    } catch (err) {
      setEditingError(err.response?.data?.error || 'Failed to load test results.');
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
      setEditingSuccess('Test deleted successfully.');
      setEditingError(null);
    } catch (err) {
      setEditingError(err.response?.data?.error || 'Failed to delete test.');
    }
    setLoading(false);
  };

  const closeTestAnswers = () => {
    setSelectedTest(null);
  };

  if (loading) return <p style={{ padding: '20px', color: '#FFFFFF', backgroundColor: '#4B5320', textAlign: 'center', fontFamily: 'sans-serif', fontSize: '16px' }}>Loading...</p>;

  return (
    <div>
      {editingError && <p style={{ backgroundColor: '#FFF3F3', color: '#B22222', borderLeft: '4px solid #B22222', padding: '15px', marginBottom: '20px', fontFamily: 'sans-serif', borderRadius: '4px', fontSize: '14px' }}>Error: {editingError}</p>}
      {editingSuccess && <p style={{ backgroundColor: '#E6FFE6', color: '#228B22', borderLeft: '4px solid #228B22', padding: '15px', marginBottom: '20px', fontFamily: 'sans-serif', borderRadius: '4px', fontSize: '14px' }}>Success: {editingSuccess}</p>}

      <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'sans-serif', backgroundColor: '#4B5320', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
        Manage Tests & Results
      </h3>
      
      {/* Tests Table - Remains the same */}
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
      
      {/* Results Table - Using reusable component */}
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
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                  {result.userId ? `${result.userId.name} ${result.userId.surname}` : 'Unknown'}
                </td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                  {result.testId?.title || 'Unknown'}
                </td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                  {result.subject || result.testId?.subject || 'Unknown'}
                </td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                  {result.class || result.testId?.class || 'Unknown'}
                </td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                  {result.session || 'Unknown'}
                </td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                  <ResultScoreEditor
                    result={result}
                    editingResultId={editingResultId}
                    editScore={editScore}
                    setEditScore={setEditScore}
                    loading={editingLoading}
                    onSave={handleSaveScore}
                    onCancel={cancelEditing}
                    maxScore={result.totalMarks || 100}
                  />
                </td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px', display: 'flex', gap: '5px' }}>
                  {editingResultId !== result._id && (
                    <>
                      <button
                        onClick={() => startEditing(result)}
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

      {/* Selected Test Modal - Remains the same */}
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