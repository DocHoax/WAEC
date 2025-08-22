import React from 'react';

const Filters = ({ filterSubject, setFilterSubject, filterClass, setFilterClass, subjectOptions, classOptions }) => {
  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      marginBottom: '2rem',
      border: '1px solid #A8B5A2',
    }}>
      <h3 style={{
        color: '#4B7043',
        fontSize: '1.2rem',
        fontWeight: '600',
        marginBottom: '1rem',
      }}>
        Filter Tests
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}>
        <div>
          <label style={{
            display: 'block',
            color: '#333333',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
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
              border: '1px solid #A8B5A2',
              fontSize: '1rem',
              backgroundColor: 'white',
              color: '#333333',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4B7043';
              e.target.style.boxShadow = '0 0 0 3px rgba(75, 112, 67, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#A8B5A2';
              e.target.style.boxShadow = 'none';
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
            color: '#333333',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
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
              border: '1px solid #A8B5A2',
              fontSize: '1rem',
              backgroundColor: 'white',
              color: '#333333',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4B7043';
              e.target.style.boxShadow = '0 0 0 3px rgba(75, 112, 67, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#A8B5A2';
              e.target.style.boxShadow = 'none';
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

export default Filters;