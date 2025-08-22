import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const TestPreview = () => {
  const { testId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      setError('Access restricted to teachers.');
      navigate('/login');
      return;
    }

    const fetchTest = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found.');
        const res = await axios.get(`http://localhost:5000/api/tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('TestPreview - Fetched test:', res.data);
        setTest(res.data);
        setQuestions(res.data.questions || []);
        setError(null);
      } catch (err) {
        console.error('TestPreview - Fetch test error:', err.response?.data || err.message);
        if (err.response?.status === 401) {
          setError('Session expired. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setError(err.response?.data?.error || 'Failed to load test. Please try again.');
        }
      }
      setLoading(false);
    };

    fetchTest();
  }, [testId, user, navigate]);

  if (loading) return <p style={{ padding: '20px' }}>Loading...</p>;
  if (error) return <p style={{ padding: '20px', color: 'red' }}>{error}</p>;
  if (!test) return <p style={{ padding: '20px', color: 'red' }}>Test not found.</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>{test.title} (Preview)</h2>
      <p>Subject: {test.subject} | Class: {test.class} | Session: {test.session}</p>
      <p>Total Questions: {questions.length}</p>
      {questions.length === 0 ? (
        <p style={{ color: 'orange' }}>No questions assigned to this test.</p>
      ) : (
        questions.map((question, index) => (
          <div key={question._id} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}>
            <h4 style={{ fontSize: '18px' }}>Question {index + 1}: {question.text}</h4>
            {question.imageUrl && (
              <img src={question.imageUrl} alt="Question" style={{ maxWidth: '200px', margin: '10px 0' }} />
            )}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {question.options.map((option, i) => (
                <li key={i} style={{ margin: '5px 0' }}>
                  <input
                    type="radio"
                    name={`question-${question._id}`}
                    value={option}
                    disabled
                    style={{ marginRight: '10px' }}
                  />
                  {option}
                </li>
              ))}
            </ul>
            <p style={{ color: 'green' }}>Correct Answer: {question.correctAnswer}</p>
          </div>
        ))
      )}
      <button
        onClick={() => navigate('/teacher')}
        style={{ padding: '8px', background: '#4bc0c0', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default TestPreview;