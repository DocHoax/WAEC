import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const Tests = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');

  useEffect(() => {
    const fetchTests = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        setLoading(false);
        navigate('/login');
        return;
      }
      try {
        const res = await axios.get('http://localhost:5000/api/tests', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Tests - Fetched tests:', res.data);
        setTests(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Tests - Error:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to load tests.');
        setLoading(false);
      }
    };

    if (user && user.role === 'teacher') {
      fetchTests();
    }
  }, [user, navigate]);

  const filteredTests = tests.filter(
    test =>
      (!filterSubject || test.subject === filterSubject) &&
      (!filterClass || test.class === filterClass)
  );

  const subjectOptions = [...new Set(tests.map(test => test.subject).filter(Boolean))];
  const classOptions = [...new Set(tests.map(test => test.class).filter(Boolean))];

  if (!user || user.role !== 'teacher') {
    return (
      <div style={{
        padding: '20px',
        color: '#B22222',
        fontFamily: 'sans-serif',
        backgroundColor: '#FFF3F3',
        minHeight: '100vh',
        textAlign: 'center'
      }}>
        Access restricted to teachers.
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
        Loading tests...
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
      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#4B5320',
        marginBottom: '20px'
      }}>Available Tests</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px',
        backgroundColor: '#FFFFFF',
        padding: '20px',
        borderRadius: '6px',
        border: '1px solid #E0E0E0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{
            fontSize: '14px',
            color: '#4B5320',
            fontWeight: '500',
            marginBottom: '8px'
          }}>Subject</label>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            style={{
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #E0E0E0',
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              color: '#4B5320'
            }}
            onFocus={e => (e.target.style.borderColor = '#4B5320')}
            onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
          >
            <option value="">All Subjects</option>
            {subjectOptions.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{
            fontSize: '14px',
            color: '#4B5320',
            fontWeight: '500',
            marginBottom: '8px'
          }}>Class</label>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            style={{
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #E0E0E0',
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              color: '#4B5320'
            }}
            onFocus={e => (e.target.style.borderColor = '#4B5320')}
            onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
          >
            <option value="">All Classes</option>
            {classOptions.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {filteredTests.length === 0 ? (
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '40px',
            borderRadius: '6px',
            textAlign: 'center',
            border: '1px solid #E0E0E0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#4B5320',
              marginBottom: '10px'
            }}>No tests available</p>
            <p style={{ fontSize: '14px', color: '#4B5320' }}>
              Create a new test to get started!
            </p>
          </div>
        ) : (
          filteredTests.map(test => (
            <div key={test._id} style={{
              backgroundColor: '#FFFFFF',
              padding: '20px',
              borderRadius: '6px',
              border: '1px solid #E0E0E0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              position: 'relative'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#4B5320',
                marginBottom: '15px'
              }}>{test.title}</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '20px'
              }}>
                <div style={{
                  backgroundColor: '#F8F9FA',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#4B5320'
                }}>
                  <span style={{ fontWeight: '500', marginRight: '5px' }}>Subject:</span> {test.subject}
                </div>
                <div style={{
                  backgroundColor: '#F8F9FA',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#4B5320'
                }}>
                  <span style={{ fontWeight: '500', marginRight: '5px' }}>Class:</span> {test.class}
                </div>
                <div style={{
                  backgroundColor: '#F8F9FA',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#4B5320'
                }}>
                  <span style={{ fontWeight: '500', marginRight: '5px' }}>Duration:</span> {test.duration} mins
                </div>
                <div style={{
                  backgroundColor: '#F8F9FA',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#4B5320'
                }}>
                  <span style={{ fontWeight: '500', marginRight: '5px' }}>Until:</span> {new Date(test.availability.end).toLocaleDateString()}
                </div>
              </div>
              <Link
                to={`/teacher/test-results/${test._id}`}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  backgroundColor: '#D4A017',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                  e.currentTarget.style.color = '#4B5320';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.backgroundColor = '#D4A017';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
              >
                View Results
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Tests;