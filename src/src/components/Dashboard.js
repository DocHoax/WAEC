import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTests = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        navigate('/login');
        return;
      }
      try {
        const res = await axios.get('http://localhost:5000/api/tests', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTests(res.data);
        const newTests = res.data.filter(test => {
          const batch = test.batches?.find(b => b.students.includes(user._id));
          if (!batch) return false;
          const now = new Date();
          return now >= new Date(batch.schedule.start) && now <= new Date(batch.schedule.end);
        });
        setNotifications(
          newTests.map(test => ({
            message: `New test available: ${test.title} (${test.subject}/${test.class})`,
            type: 'info',
          }))
        );
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load tests.');
      }
    };

    if (user && user.role === 'student') {
      fetchTests();
    }
  }, [user, navigate]);

  const handleDismissNotification = (index) => {
    setNotifications(notifications.filter((_, i) => i !== index));
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'sans-serif'
    }}>
      {error && (
        <div style={{
          backgroundColor: '#FFF3F3',
          color: '#B22222',
          borderLeft: '4px solid #B22222',
          padding: '15px',
          margin: '20px 30px',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <p>Error: {error}</p>
        </div>
      )}
      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#4B5320',
        marginBottom: '10px'
      }}>Welcome, {user.name}!</h2>
      <p style={{
        fontSize: '16px',
        color: '#4B5320',
        marginBottom: '20px'
      }}>Your WAEC prep journey continues at Sanniville Academy</p>
      {notifications.length > 0 && (
        <div style={{
          marginBottom: '30px'
        }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#4B5320',
            marginBottom: '10px'
          }}>Notifications</h3>
          {notifications.map((n, i) => (
            <div key={i} style={{
              backgroundColor: '#FFFFFF',
              padding: '15px',
              border: '1px solid #E0E0E0',
              borderLeft: '4px solid #D4A017',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s'
            }}>
              <span>{n.message}</span>
              <button
                onClick={() => handleDismissNotification(i)}
                style={{
                  backgroundColor: '#D4A017',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={e => (e.currentTarget.style.backgroundColor = '#B22222')}
                onMouseOut={e => (e.currentTarget.style.backgroundColor = '#D4A017')}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{
        marginBottom: '30px'
      }}>
        <h3 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#4B5320',
          marginBottom: '10px'
        }}>Test Summary</h3>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '20px',
          borderRadius: '6px',
          border: '1px solid #E0E0E0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{
            fontSize: '16px',
            color: '#4B5320',
            fontWeight: '600',
            margin: 0
          }}>{tests.length} Tests Available</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;