import React from 'react';
import { FiUser, FiLogOut } from 'react-icons/fi';

const Header = ({ user, onLogout }) => {
  return (
    <header style={{
      backgroundColor: '#2c3e50',
      color: '#FFFFFF',
      padding: '15px 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      borderBottom: '1px solid #000000',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      height: '60px',
      fontFamily: '"Fredoka", sans-serif',
      animation: 'slideDown 0.6s ease-out'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <img src="/uploads/sanni.png" alt="Sanniville Academy" style={{
          height: '40px',
          borderRadius: '6px'
        }} onError={(e) => e.target.style.display = 'none'} />
        <h1 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 'bold',
          fontFamily: '"Fredoka", sans-serif'
        }}>Student Dashboard</h1>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
      }}>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: '"Fredoka", sans-serif',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <FiUser style={{
            fontSize: '18px'
          }} /> {user.name}
        </span>
        <button
          onClick={onLogout}
          style={{
            backgroundColor: '#3498db',
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            fontFamily: '"Fredoka", sans-serif',
            fontSize: '14px'
          }}
        >
          <FiLogOut style={{
            fontSize: '18px'
          }} /> Logout
        </button>
      </div>
    </header>
  );
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
const keyframes = `
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
`;

// Inject keyframes
if (styleSheet) {
  styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
}

// Add hover effects
const hoverStyles = `
  button:hover {
    background-color: #2980b9;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
`;

// Inject hover styles
if (styleSheet) {
  const hoverStyleElement = document.createElement('style');
  hoverStyleElement.textContent = hoverStyles;
  document.head.appendChild(hoverStyleElement);
}

export default Header;