import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null); // Clear error when user starts typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await login(formData.username, formData.password);
      const { role } = response.user;
      if (role === 'admin') navigate('/admin');
      else if (role === 'teacher') navigate('/teacher');
      else if (role === 'student') navigate('/student');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      padding: '20px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '450px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '6px',
          background: 'linear-gradient(90deg, #4B5320 0%, #FFD700 100%)'
        }}></div>
        
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <img 
            src="/images/sanni.png" 
            alt="Sanniville Academy" 
            style={{
              width: '100px',
              height: 'auto',
              marginBottom: '20px'
            }} 
          />
          <h2 style={{
            color: '#4B5320',
            margin: '0 0 10px 0',
            fontSize: '1.8rem'
          }}>
            Welcome Back
          </h2>
          <p style={{
            color: '#6c757d',
            margin: '0',
            fontSize: '1rem'
          }}>
            Sign in to continue your learning journey
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            borderLeft: '4px solid #dc3545',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ marginRight: '8px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4B5320',
              fontWeight: '500'
            }}>
              Username or Email
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                fontSize: '1rem',
                transition: 'border-color 0.3s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4B5320'}
              onBlur={(e) => e.target.style.borderColor = '#ced4da'}
              placeholder="Enter your username or email"
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4B5320',
              fontWeight: '500'
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                fontSize: '1rem',
                transition: 'border-color 0.3s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4B5320'}
              onBlur={(e) => e.target.style.borderColor = '#ced4da'}
              placeholder="Enter your password"
            />
            <div style={{
              textAlign: 'right',
              marginTop: '8px'
            }}>
              <a href="/forgot-password" style={{
                color: '#6c757d',
                fontSize: '0.85rem',
                textDecoration: 'none'
              }}>
                Forgot password?
              </a>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#4B5320',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isLoading ? '0.7' : '1'
            }}
            onMouseOver={(e) => !isLoading && (e.target.style.backgroundColor = '#3a4418')}
            onMouseOut={(e) => !isLoading && (e.target.style.backgroundColor = '#4B5320')}
          >
            {isLoading ? (
              <>
                <span style={{ marginRight: '8px' }}>⏳</span>
                Authenticating...
              </>
            ) : (
              <>
                <span style={{ marginRight: '8px' }}>🔑</span>
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          color: '#6c757d',
          fontSize: '0.9rem',
          borderTop: '1px solid #e9ecef',
          paddingTop: '20px'
        }}>
          <p style={{ margin: '0' }}>
            New to Sanniville?{' '}
            <a href="/register" style={{
              color: '#4B5320',
              fontWeight: '500',
              textDecoration: 'none'
            }}>
              Create an account
            </a>
          </p>
        </div>

        <div style={{
          marginTop: '30px',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#adb5bd'
        }}>
          <p style={{ margin: '0' }}>
            © {new Date().getFullYear()} Sanniville Academy. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;