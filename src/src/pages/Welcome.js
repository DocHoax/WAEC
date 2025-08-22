import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Welcome = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user || user.role !== 'student') {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#d9534f',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        margin: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3>Access Restricted</h3>
        <p>This portal is exclusively for registered students of Sanniville Academy</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
      padding: '20px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '800px',
        backgroundColor: 'white',
        borderRadius: '15px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        padding: '40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '5px solid #4B5320'
      }}>
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          width: '100px',
          height: '100px',
          backgroundColor: '#FFD700',
          clipPath: 'polygon(0 0, 100% 0, 100% 100%)'
        }}></div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <img 
            src="/images/sanni.png" 
            alt="Sanniville Academy" 
            style={{
              width: '120px',
              height: 'auto',
              marginBottom: '20px'
            }} 
          />
        </div>

        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          border: '4px solid #FFD700',
          margin: '0 auto 20px',
          overflow: 'hidden',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
          <img
            src={user.profileImage || '/images/student1.png'}
            alt={`${user.name}'s Avatar`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>

        <h1 style={{
          color: '#4B5320',
          marginBottom: '10px',
          fontSize: '2.2rem'
        }}>
          Welcome Back, {user.name.split(' ')[0]}!
        </h1>

        <p style={{
          fontSize: '1.2rem',
          color: '#555',
          marginBottom: '30px',
          lineHeight: '1.6'
        }}>
          Your journey to WAEC excellence starts here. <br />
          We've prepared everything you need to succeed.
        </p>

        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '30px',
          borderLeft: '4px solid #FFD700'
        }}>
          <p style={{ margin: '5px 0', fontWeight: '500' }}>
            <span style={{ color: '#4B5320' }}>Class:</span> {user.class || 'Not specified'}
          </p>
          <p style={{ margin: '5px 0', fontWeight: '500' }}>
            <span style={{ color: '#4B5320' }}>Subjects:</span> {(user.enrolledSubjects || []).map(s => s.subject).join(', ') || 'None enrolled yet'}
          </p>
        </div>

        <button 
          onClick={() => navigate('/student')}
          style={{
            backgroundColor: '#4B5320',
            color: 'white',
            border: 'none',
            padding: '12px 30px',
            fontSize: '1.1rem',
            borderRadius: '50px',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.3s',
            boxShadow: '0 4px 8px rgba(75, 83, 32, 0.3)',
            marginBottom: '30px'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#3a4418'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#4B5320'}
        >
          🚀 Launch Your Prep Journey
        </button>

        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #eee',
          fontSize: '0.9rem',
          color: '#777'
        }}>
          <p style={{ marginBottom: '10px' }}>Need help? Contact support@sanniville.edu.ng</p>
          <a 
            href="https://devsannisystems.com" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: '#4B5320',
              textDecoration: 'none',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            <span style={{ marginRight: '5px' }}>Powered by</span>
            <span style={{ 
              color: '#FFD700',
              fontWeight: '700'
            }}>Devsanni Systems</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Welcome;