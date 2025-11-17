import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Home = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '50px',
      backgroundColor: '#b8c2cc',
      fontFamily: '"Fredoka", sans-serif',
      minHeight: '100vh'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        maxWidth: '600px',
        margin: '0 auto',
        animation: 'fadeInUp 0.6s ease-out'
      }}>
        <h1 style={{
          color: '#4B5320',
          marginBottom: '20px',
          fontSize: '2.5rem',
          fontWeight: '600'
        }}>Welcome to WAEC CBT WebApp</h1>
        <p style={{
          fontSize: '1.1rem',
          color: '#666',
          marginBottom: '30px'
        }}>Prepare for WAEC exams with our computer-based testing platform.</p>
        {user ? (
          <div>
            <p style={{
              fontSize: '1.2rem',
              color: '#4B5320',
              marginBottom: '20px'
            }}>Hello, {user.name} ({user.role})</p>
            <button 
              onClick={() => navigate(`/${user.role}`)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#4B5320',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginRight: '10px'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Go to {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
            </button>
            <button 
              onClick={logout} 
              style={{
                padding: '12px 24px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Logout
            </button>
          </div>
        ) : (
          <div>
            <Link to="/login">
              <button style={{
                padding: '12px 24px',
                backgroundColor: '#4B5320',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Login
              </button>
            </Link>
          </div>
        )}
      </div>
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default Home;