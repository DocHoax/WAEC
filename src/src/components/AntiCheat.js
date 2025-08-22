import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const AntiCheat = ({ user }) => {
  const { testId } = useParams();
  const [violationCount, setViolationCount] = useState(0);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    console.log('AntiCheat - Initialized:', { user: user?.username, testId });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('AntiCheat - Tab switch detected:', { user: user?.username, testId });
        setViolationCount((prev) => prev + 1);
        setWarning('Warning: Do not switch tabs or windows during the test!');
        logViolation('Tab switch');
      } else {
        setTimeout(() => setWarning(''), 3000); // Clear warning after 3s
      }
    };

    const handleBlur = () => {
      console.log('AntiCheat - Window blur detected:', { user: user?.username, testId });
      setViolationCount((prev) => prev + 1);
      setWarning('Warning: Stay on the test window!');
      logViolation('Window blur');
    };

    const logViolation = async (type) => {
      const token = localStorage.getItem('token');
      if (!token || !user) return;

      try {
        await axios.post(
          'http://localhost:5000/api/cheat-logs',
          { testId, userId: user.userId, type },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('AntiCheat - Violation logged:', { type, testId, userId: user.userId });
      } catch (error) {
        console.error('AntiCheat - Log error:', error.response?.data || error.message);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [user, testId]);

  return (
    <div>
      {warning && (
        <div style={{ background: '#ffcccc', padding: '10px', color: 'red', position: 'fixed', top: '10px', width: '100%', textAlign: 'center' }}>
          {warning}
        </div>
      )}
      <p>Violations: {violationCount}</p>
    </div>
  );
};

export default AntiCheat;