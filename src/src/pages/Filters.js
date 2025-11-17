import React from 'react';

const Filters = ({ filterSubject, setFilterSubject, filterClass, setFilterClass, subjectOptions, classOptions }) => {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      marginBottom: '2rem',
      border: '1px solid #E0E0E0',
      fontFamily: '"Fredoka", sans-serif',
      animation: 'fadeInUp 0.6s ease-out',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease'
    }}>
      <h3 style={{
        color: '#2c3e50',
        fontSize: '1.2rem',
        fontWeight: '600',
        marginBottom: '1rem',
        fontFamily: '"Fredoka", sans-serif',
      }}>
        Filter Tests
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
      }}>
        <div>
          <label style={{
            display: 'block',
            color: '#2c3e50',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            fontFamily: '"Fredoka", sans-serif',
          }}>
            Subject
          </label>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #E0E0E0',
              fontSize: '1rem',
              backgroundColor: 'white',
              color: '#333333',
              transition: 'all 0.3s ease',
              fontFamily: '"Fredoka", sans-serif',
            }}
          >
            <option value="">All Subjects</option>
            {subjectOptions.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{
            display: 'block',
            color: '#2c3e50',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            fontFamily: '"Fredoka", sans-serif',
          }}>
            Class
          </label>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #E0E0E0',
              fontSize: '1rem',
              backgroundColor: 'white',
              color: '#333333',
              transition: 'all 0.3s ease',
              fontFamily: '"Fredoka", sans-serif',
            }}
          >
            <option value="">All Classes</option>
            {classOptions.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
const keyframes = `
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
`;

// Inject keyframes
if (styleSheet) {
  styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
}

// Add hover effects
const hoverStyles = `
  .filters-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 15px rgba(0,0,0,0.15);
  }
  select:hover {
    border-color: #3498db;
  }
  select:focus {
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    outline: none;
  }
`;

// Inject hover styles
if (styleSheet) {
  const hoverStyleElement = document.createElement('style');
  hoverStyleElement.textContent = hoverStyles;
  document.head.appendChild(hoverStyleElement);
}

export default Filters;