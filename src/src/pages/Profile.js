import React from 'react';

const Profile = () => {
  return (
    <div style={{
      padding: '20px',
      fontFamily: '"Fredoka", sans-serif',
      backgroundColor: '#b8c2cc',
      minHeight: '100vh',
      animation: 'fadeIn 0.6s ease-out'
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        maxWidth: '600px',
        margin: '0 auto'
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-5px)';
        e.target.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#4B5320',
          marginBottom: '10px'
        }}>Profile</h2>
        <p style={{
          fontSize: '16px',
          color: '#4B5320',
          marginBottom: '20px'
        }}>Manage your profile information here. (Placeholder)</p>
      </div>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default Profile;