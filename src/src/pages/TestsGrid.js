import React from 'react';
import { Link } from 'react-router-dom';

const TestsGrid = ({ tests }) => {
  return (
    <div>
      <h2 style={{
        color: '#4B7043',
        fontSize: '1.4rem',
        fontWeight: '600',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        📚 Available Tests ({tests.length})
      </h2>
      {tests.length === 0 ? (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #A8B5A2',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
          }}>
            📝
          </div>
          <h3 style={{
            color: '#333333',
            fontSize: '1.2rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
          }}>
            No tests available
          </h3>
          <p style={{
            color: '#333333',
            fontSize: '1rem',
          }}>
            Check back soon for new tests!
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem',
        }}>
          {tests.map(test => {
            const isAvailable = new Date() <= new Date(test.availability.end);
            return (
              <div
                key={test._id}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #A8B5A2',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-4px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: isAvailable ? '#A8B5A2' : '#FEE2E2',
                  color: isAvailable ? '#333333' : '#FF6B6B',
                }}>
                  {isAvailable ? '✅ Available' : '❌ Expired'}
                </div>
                <div style={{ marginBottom: '1rem', paddingRight: '5rem' }}>
                  <h3 style={{
                    color: '#4B7043',
                    fontSize: '1.3rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    lineHeight: '1.3',
                  }}>
                    {test.title}
                  </h3>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{
                    backgroundColor: '#F4F4F4',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #A8B5A2',
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#333333',
                      fontWeight: '500',
                      marginBottom: '0.25rem',
                    }}>
                      SUBJECT
                    </div>
                    <div style={{
                      color: '#333333',
                      fontWeight: '600',
                    }}>
                      {test.subject}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#F4F4F4',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #A8B5A2',
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#333333',
                      fontWeight: '500',
                      marginBottom: '0.25rem',
                    }}>
                      CLASS
                    </div>
                    <div style={{
                      color: '#333333',
                      fontWeight: '600',
                    }}>
                      {test.class}
                    </div>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#F4F4F4',
                  borderRadius: '8px',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span style={{ fontSize: '1rem' }}>⏱️</span>
                    <span style={{
                      color: '#333333',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                    }}>
                      {test.duration} mins
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span style={{ fontSize: '1rem' }}>📅</span>
                    <span style={{
                      color: '#333333',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                    }}>
                      Until {new Date(test.availability.end).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/test/${test._id}`}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.875rem',
                    backgroundColor: isAvailable ? '#4B7043' : '#A8B5A2',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    textAlign: 'center',
                    fontSize: '1rem',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    border: 'none',
                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                  }}
                  onMouseEnter={(e) => {
                    if (isAvailable) {
                      e.target.style.backgroundColor = '#3A5A33';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isAvailable) {
                      e.target.style.backgroundColor = '#4B7043';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {isAvailable ? '🚀 Take Test' : '⏰ Test Expired'}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TestsGrid;