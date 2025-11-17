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
      animation: 'fadeIn 0.8s ease-in'
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
            transition: 'all 0.3s ease',
          }}
        >
          Devsanni Systems
        </a>
        <span>⚡</span>
      </div>
    </footer>
  );
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
const keyframes = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

// Inject keyframes
if (styleSheet) {
  styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
}

// Add hover effects
const hoverStyles = `
  a:hover {
    color: #2980b9;
    transform: translateY(-1px);
  }
`;

// Inject hover styles
if (styleSheet) {
  const hoverStyleElement = document.createElement('style');
  hoverStyleElement.textContent = hoverStyles;
  document.head.appendChild(hoverStyleElement);
}

export default Footer;