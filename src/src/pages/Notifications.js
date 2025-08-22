import React from 'react';

const Notifications = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{
        color: '#4B7043',
        fontSize: '1.4rem',
        fontWeight: '600',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        🔔 Notifications
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {notifications.map((n, i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid #A8B5A2',
              borderLeft: '4px solid #A8B5A2',
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <span style={{
              color: '#333333',
              fontSize: '1rem',
            }}>
              {n.message}
            </span>
            <button
              onClick={() => onDismiss(i)}
              style={{
                background: 'none',
                border: 'none',
                color: '#333333',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '4px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.color = '#4B7043'}
              onMouseLeave={(e) => e.target.style.color = '#333333'}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;