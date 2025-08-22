import React from 'react';
import { useNavigate } from 'react-router-dom';

const Submitted = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8F9FA',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Roboto', sans-serif",
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        backgroundColor: '#FFFFFF',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#4B5320',
          marginBottom: '16px'
        }}>Test Submitted Successfully</h2>
        <p style={{
          fontSize: '16px',
          color: '#4B5320',
          marginBottom: '24px'
        }}>
          Your test has been submitted. You will be notified when results are available.
        </p>
        <button
          onClick={() => navigate('/student/tests')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#D4A017',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#B8860B')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#D4A017')}
          aria-label="Back to tests"
        >
          Back to Tests
        </button>
      </div>
    </div>
  );
};

export default Submitted;