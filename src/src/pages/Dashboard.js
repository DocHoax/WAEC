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
        const res = await axios.get('https://waec-gfv0.onrender.com/api/tests', {
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
      fontFamily: '"Fredoka", sans-serif',
      backgroundColor: '#b8c2cc',
      minHeight: '100vh',
      animation: 'fadeIn 0.8s ease-in'
    }}>
      {error && (
        <div style={{
          backgroundColor: '#FFF3F3',
          color: '#B22222',
          borderLeft: '4px solid #B22222',
          padding: '15px',
          margin: '20px 30px',
          borderRadius: '8px',
          fontSize: '14px',
          animation: 'shake 0.5s ease-in-out'
        }}>
          <p>Error: {error}</p>
        </div>
      )}
      <div style={{
        backgroundColor: '#2c3e50',
        color: '#FFFFFF',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '25px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        animation: 'slideDown 0.6s ease-out'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '10px'
        }}>Welcome, {user.name}!</h2>
        <p style={{
          fontSize: '16px',
          color: '#bdc3c7',
          marginBottom: '0'
        }}>Your WAEC prep journey continues at Sanniville Academy</p>
      </div>
      
      {notifications.length > 0 && (
        <div style={{
          marginBottom: '30px',
          animation: 'fadeInUp 0.6s ease-out 0.2s both'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#2c3e50',
            marginBottom: '15px'
          }}>Notifications</h3>
          {notifications.map((n, i) => (
            <div key={i} style={{
              backgroundColor: '#FFFFFF',
              padding: '20px',
              border: '1px solid #E0E0E0',
              borderLeft: '4px solid #3498db',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              animation: `fadeInUp 0.6s ease-out ${i * 0.1 + 0.3}s both`
            }}>
              <span style={{ fontWeight: '500', color: '#2c3e50' }}>{n.message}</span>
              <button
                onClick={() => handleDismissNotification(i)}
                style={{
                  backgroundColor: '#3498db',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  fontWeight: '600'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{
        marginBottom: '30px',
        animation: 'fadeInUp 0.6s ease-out 0.4s both'
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#2c3e50',
          marginBottom: '15px'
        }}>Test Summary</h3>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '25px',
          borderRadius: '12px',
          border: '1px solid #E0E0E0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease'
        }}>
          <p style={{
            fontSize: '18px',
            color: '#2c3e50',
            fontWeight: '600',
            margin: 0
          }}>{tests.length} Tests Available</p>
          <p style={{
            fontSize: '14px',
            color: '#7f8c8d',
            margin: '5px 0 0 0'
          }}>Check your assigned tests and upcoming exams</p>
        </div>
      </div>
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
  .notification-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 15px rgba(0,0,0,0.15);
  }
  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  .test-summary:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
  }
`;

// Inject hover styles
if (styleSheet) {
  const hoverStyleElement = document.createElement('style');
  hoverStyleElement.textContent = hoverStyles;
  document.head.appendChild(hoverStyleElement);
}

export default Dashboard;