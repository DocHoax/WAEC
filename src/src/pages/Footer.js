import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      backgroundColor: '#2c3e50',
      color: '#bdc3c7',
      padding: '2rem',
      textAlign: 'center',
      marginTop: '3rem',
      fontFamily: '"Fredoka", sans-serif',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        fontSize: '0.9rem',
      }}>
        <span>Powered by</span>
        <a
          href="https://devsannisystems.com"
          style={{
            color: '#3498db',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'color 0.3s ease',
          }}
          onMouseEnter={(e) => e.target.style.color = '#2980b9'}
          onMouseLeave={(e) => e.target.style.color = '#3498db'}
        >
          Devsanni Systems
        </a>
        <span>⚡</span>
      </div>
    </footer>
  );
};

export default Footer;