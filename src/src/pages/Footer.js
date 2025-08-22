import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      backgroundColor: '#333333',
      color: '#A8B5A2',
      padding: '2rem',
      textAlign: 'center',
      marginTop: '3rem',
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
            color: '#A8B5A2',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.color = '#4B7043'}
          onMouseLeave={(e) => e.target.style.color = '#A8B5A2'}
        >
          Devsanni Systems
        </a>
        <span>⚡</span>
      </div>
    </footer>
  );
};

export default Footer;