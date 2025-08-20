import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useTeacherData = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const res = await axios.get('http://localhost:5000/api/tests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched tests:', res.data);
      const validTests = res.data.filter(test => test._id && /^[0-9a-fA-F]{24}$/.test(test._id));
      setTests(validTests);
      if (res.data.length !== validTests.length) {
        console.warn('Invalid test IDs filtered out:', res.data.filter(test => !/^[0-9a-fA-F]{24}$/.test(test._id)));
        setError('Some tests could not be loaded due to invalid IDs.');
      }
    } catch (err) {
      console.error('Fetch tests error:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to load tests. Please try again.');
      }
    }
    setLoading(false);
  };

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const res = await axios.get('http://localhost:5000/api/questions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched questions:', res.data);
      if (!res.data || res.data.length === 0) {
        console.warn('No questions found');
        setError('No questions available. Please add questions to the question bank.');
      }
      setQuestions(res.data || []);
    } catch (err) {
      console.error('Fetch questions error:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to load questions. Please check your connection or contact support.');
      }
    }
    setLoading(false);
  };

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const res = await axios.get('http://localhost:5000/api/results', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(res.data);
    } catch (err) {
      console.error('Fetch results error:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to load results. Please try again.');
      }
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const res = await axios.get('http://localhost:5000/api/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched analytics:', res.data);
      setAnalytics(Array.isArray(res.data.analytics) ? res.data.analytics : []);
    } catch (err) {
      console.error('Fetch analytics error:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to load analytics. Please try again.');
      }
      setAnalytics([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && user.role === 'teacher') {
      console.log('User in useTeacherData:', user);
      fetchTests();
      fetchQuestions();
      fetchResults();
      fetchAnalytics();
    } else if (!user) {
      setError('Session expired. Please log in again.');
      navigate('/login');
    }
  }, [user, navigate]);

  return {
    tests,
    questions,
    results,
    analytics,
    loading,
    error,
    success,
    setError,
    setSuccess,
    fetchTests,
    fetchQuestions,
    fetchResults,
    fetchAnalytics,
    user,
    navigate,
  };
};

export default useTeacherData;