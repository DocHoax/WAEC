import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      redirectBasedOnRole(user.role);
    }
  }, [user, navigate]);

  const redirectBasedOnRole = (role) => {
    switch (role) {
      case 'student':
        navigate('/student/dashboard');
        break;
      case 'teacher':
        navigate('/teacher');
        break;
      case 'admin':
      case 'super_admin':
        navigate('/admin');
        break;
      default:
        break;
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(formData.username, formData.password);
      // The redirect will be handled by the useEffect above
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
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
<<<<<<< HEAD
      backgroundColor: '#b8c2cc',
      padding: '20px',
      fontFamily: '"Fredoka", sans-serif'
=======
      backgroundColor: '#ffffff',
      padding: '20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
>>>>>>> d99923fa028164108d1f648bb31333e96ab4c91d
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'white',
<<<<<<< HEAD
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden',
        animation: 'slideIn 0.5s ease-out'
=======
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        padding: '48px 40px',
        border: '1px solid #f0f0f0'
>>>>>>> d99923fa028164108d1f648bb31333e96ab4c91d
      }}>
        
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#4B5320',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: 'white',
            fontSize: '24px',
            fontWeight: '600'
          }}>
            SA
          </div>
          <h1 style={{
            color: '#1a1a1a',
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '600',
            letterSpacing: '-0.02em'
          }}>
            Welcome back
          </h1>
          <p style={{
            color: '#666',
            margin: '0',
            fontSize: '15px',
            lineHeight: '1.5'
          }}>
            Sign in to your account to continue
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #fecaca',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            animation: 'shake 0.5s ease-in-out'
          }}>
            <span style={{ marginRight: '8px', fontSize: '16px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#374151',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isLoading}
              style={{
                width: '100%',
<<<<<<< HEAD
                padding: '12px 15px',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                fontSize: '1rem',
                transition: 'all 0.3s',
                boxSizing: 'border-box',
                fontFamily: '"Fredoka", sans-serif'
=======
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '15px',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
                backgroundColor: isLoading ? '#f9fafb' : '#fafafa',
                cursor: isLoading ? 'not-allowed' : 'text'
>>>>>>> d99923fa028164108d1f648bb31333e96ab4c91d
              }}
              onFocus={(e) => {
                if (!isLoading) {
                  e.target.style.borderColor = '#4B5320';
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(75, 83, 32, 0.1)';
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.backgroundColor = isLoading ? '#f9fafb' : '#fafafa';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="Enter your username"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <label style={{
                color: '#374151',
                fontWeight: '500',
                fontSize: '14px'
              }}>
                Password
              </label>
              <a 
                href="/forgot-password" 
                style={{
                  color: isLoading ? '#9ca3af' : '#4B5320',
                  fontSize: '13px',
                  textDecoration: 'none',
                  fontWeight: '500',
                  pointerEvents: isLoading ? 'none' : 'auto'
                }}
              >
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
              style={{
                width: '100%',
<<<<<<< HEAD
                padding: '12px 15px',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                fontSize: '1rem',
                transition: 'all 0.3s',
                boxSizing: 'border-box',
                fontFamily: '"Fredoka", sans-serif'
=======
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '15px',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
                backgroundColor: isLoading ? '#f9fafb' : '#fafafa',
                cursor: isLoading ? 'not-allowed' : 'text'
              }}
              onFocus={(e) => {
                if (!isLoading) {
                  e.target.style.borderColor = '#4B5320';
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(75, 83, 32, 0.1)';
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.backgroundColor = isLoading ? '#f9fafb' : '#fafafa';
                e.target.style.boxShadow = 'none';
>>>>>>> d99923fa028164108d1f648bb31333e96ab4c91d
              }}
              placeholder="Enter your password"
            />
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
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
<<<<<<< HEAD
              cursor: 'pointer',
              transition: 'all 0.3s',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isLoading ? '0.7' : '1',
              fontFamily: '"Fredoka", sans-serif'
=======
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              marginBottom: '24px',
              opacity: isLoading ? '0.7' : '1'
>>>>>>> d99923fa028164108d1f648bb31333e96ab4c91d
            }}
            onMouseOver={(e) => !isLoading && (e.target.style.backgroundColor = '#3a4418')}
            onMouseOut={(e) => !isLoading && (e.target.style.backgroundColor = '#4B5320')}
          >
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '8px'
                }}></div>
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingTop: '24px',
          borderTop: '1px solid #f0f0f0'
        }}>
          <p style={{ 
            margin: '0 0 16px 0',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            Don't have an account?{' '}
            <a 
              href="/register" 
              style={{
                color: isLoading ? '#9ca3af' : '#4B5320',
                fontWeight: '500',
                textDecoration: 'none',
                pointerEvents: isLoading ? 'none' : 'auto'
              }}
            >
              Contact administrator
            </a>
          </p>
          <p style={{
            margin: '0',
            color: '#9ca3af',
            fontSize: '12px'
          }}>
            © {new Date().getFullYear()} Sanniville Academy
          </p>
        </div>
      </div>
<<<<<<< HEAD
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
=======

      {/* Add spinning animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
>>>>>>> d99923fa028164108d1f648bb31333e96ab4c91d
          }
        `}
      </style>
    </div>
  );
};

export default Login;