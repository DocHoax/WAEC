import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiBook, FiUser, FiLogOut } from 'react-icons/fi';

const StudentHome = ({ children }) => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        setLoading(false);
        navigate('/login');
        return;
      }
      try {
        const res = await fetch('https://waec-gfv0.onrender.com/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to verify user');
        setUser(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        navigate('/login');
      }
    };
    if (!user) verifyUser();
    else setLoading(false);
  }, [user, navigate, setUser]);

  if (!user || user.role !== 'student') {
    return (
      <div style={{
        padding: '20px',
        color: '#B22222',
        backgroundColor: '#FFF3F3',
        textAlign: 'center',
        fontSize: '16px',
        minHeight: '100vh',
        fontFamily: '"Fredoka", sans-serif'
      }}>
        <p>Access Restricted: Students Only</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        color: '#4B5320',
        backgroundColor: '#F8F9FA',
        textAlign: 'center',
        fontSize: '16px',
        minHeight: '100vh',
        fontFamily: '"Fredoka", sans-serif'
      }}>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  const navItems = [
    { path: 'dashboard', icon: <FiHome />, label: 'Dashboard' },
    { path: 'tests', icon: <FiBook />, label: 'Tests' },
    { path: 'profile', icon: <FiUser />, label: 'Profile' },
  ];

  const handleNavigation = (path) => {
    navigate(`/student/${path}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <div style={{
      fontFamily: '"Fredoka", sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#b8c2cc'
    }}>
      <header style={{
        backgroundColor: '#2c3e50',
        color: '#FFFFFF',
        padding: '12px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>WAEC CBT</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '16px', fontWeight: '500' }}>{user.username}</span>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => (e.target.style.color = '#3498db')}
            onMouseOut={(e) => (e.target.style.color = '#FFFFFF')}
            aria-label="Logout"
          >
            <FiLogOut /> Logout
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', marginTop: '60px' }}>
        <nav style={{
          width: '250px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #ecf0f1',
          padding: '20px 0',
          position: 'fixed',
          top: '60px',
          bottom: 0,
          overflowY: 'auto',
          boxShadow: '2px 0 4px rgba(0,0,0,0.08)'
        }}>
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '12px 20px',
                backgroundColor: location.pathname.includes(item.path) ? '#3498db' : 'transparent',
                border: 'none',
                color: location.pathname.includes(item.path) ? '#FFFFFF' : '#555',
                fontSize: '14px',
                fontWeight: location.pathname.includes(item.path) ? '600' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (!location.pathname.includes(item.path)) {
                  e.target.style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseOut={(e) => {
                if (!location.pathname.includes(item.path)) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
              aria-label={`Navigate to ${item.label}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <main style={{
          flex: 1,
          marginLeft: '250px',
          padding: '30px',
          backgroundColor: '#b8c2cc',
          overflowY: 'auto',
          minHeight: 'calc(100vh - 60px)'
        }}>
          {error && (
            <div style={{
              backgroundColor: '#fee',
              color: '#c33',
              borderLeft: '4px solid #c33',
              padding: '12px 15px',
              marginBottom: '20px',
              borderRadius: '4px',
              fontSize: '14px',
              maxWidth: '800px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              <p style={{ margin: 0 }}>Error: {error}</p>
            </div>
          )}
          {children || <div style={{ color: '#555', fontSize: '18px' }}>Welcome to your Student Dashboard</div>}
        </main>
      </div>
    </div>
  );
};

export default StudentHome;