import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SessionSchedules = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [formData, setFormData] = useState({ sessionName: '', isActive: false });
  const [editSession, setEditSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://waec-gfv0.onrender.com/api/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sessions.');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user.role !== 'admin') {
      setError('Admin access required.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (editSession) {
        await axios.put(`https://waec-gfv0.onrender.com/api/sessions/${editSession._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('Session updated successfully.');
        setEditSession(null);
      } else {
        await axios.post('https://waec-gfv0.onrender.com/api/sessions', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('Session created successfully.');
      }
      setFormData({ sessionName: '', isActive: false });
      fetchSessions();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process session.');
    }
    setLoading(false);
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://waec-gfv0.onrender.com/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Session deleted successfully.');
      fetchSessions();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete session.');
    }
    setLoading(false);
  };

  if (loading) return (
    <div style={{
      padding: '20px',
      color: '#FFFFFF',
      backgroundColor: '#b8c2cc',
      textAlign: 'center',
      fontFamily: '"Fredoka", sans-serif',
      fontSize: '16px',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        Loading...
      </div>
    </div>
  );

  if (user.role !== 'admin') return (
    <div style={{
      padding: '20px',
      color: '#B22222',
      backgroundColor: '#b8c2cc',
      textAlign: 'center',
      fontFamily: '"Fredoka", sans-serif',
      fontSize: '16px',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 243, 243, 0.9)',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        Admin access required.
      </div>
    </div>
  );

  return (
    <div style={{
      backgroundColor: '#b8c2cc',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: '"Fredoka", sans-serif',
      animation: 'slideIn 0.5s ease-out'
    }}>
      {error && (
        <div style={{
          backgroundColor: 'rgba(255, 243, 243, 0.9)',
          color: '#B22222',
          borderLeft: '4px solid #B22222',
          padding: '15px',
          marginBottom: '20px',
          fontFamily: '"Fredoka", sans-serif',
          borderRadius: '8px',
          fontSize: '14px',
          animation: 'shake 0.5s ease-in-out'
        }}>
          Error: {error}
        </div>
      )}
      {success && (
        <div style={{
          backgroundColor: 'rgba(230, 255, 230, 0.9)',
          color: '#228B22',
          borderLeft: '4px solid #228B22',
          padding: '15px',
          marginBottom: '20px',
          fontFamily: '"Fredoka", sans-serif',
          borderRadius: '8px',
          fontSize: '14px',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          Success: {success}
        </div>
      )}

      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        marginBottom: '2rem',
        animation: 'slideUp 0.5s ease-out'
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#4B5320',
          fontFamily: '"Fredoka", sans-serif',
          marginBottom: '20px'
        }}>
          {editSession ? 'Edit Session' : 'Create Session'}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Session Name</label>
            <input
              type="text"
              value={formData.sessionName}
              onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
              required
              placeholder="e.g., 2025/2026 First Term"
              style={{
                padding: '12px',
                border: '1px solid #000000',
                borderRadius: '6px',
                width: '100%',
                fontFamily: '"Fredoka", sans-serif',
                fontSize: '14px',
                backgroundColor: '#F5F5F5',
                color: '#000000',
                transition: 'border-color 0.3s ease'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <label style={{ color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px' }}>Set as Active Session</label>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: '#D4A017',
                color: '#000000',
                border: '1px solid #000000',
                borderRadius: '6px',
                fontFamily: '"Fredoka", sans-serif',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              {editSession ? 'Update Session' : 'Create Session'}
            </button>
            {editSession && (
              <button
                type="button"
                onClick={() => { setEditSession(null); setFormData({ sessionName: '', isActive: false }); }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  border: '1px solid #000000',
                  borderRadius: '6px',
                  fontFamily: '"Fredoka", sans-serif',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        animation: 'slideUp 0.5s ease-out 0.1s both'
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#4B5320',
          fontFamily: '"Fredoka", sans-serif',
          marginBottom: '20px'
        }}>
          All Sessions
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#4B5320', color: '#FFFFFF', fontFamily: '"Fredoka", sans-serif', fontSize: '12px' }}>
                <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Session Name</th>
                <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Active</th>
                <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => (
                <tr key={session._id} style={{
                  color: '#000000',
                  fontFamily: '"Fredoka", sans-serif',
                  fontSize: '12px',
                  animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                  transition: 'background-color 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}>
                  <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>{session.sessionName}</td>
                  <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>{session.isActive ? 'Yes' : 'No'}</td>
                  <td style={{ border: '1px solid #E0E0E0', padding: '12px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setEditSession(session); setFormData({ sessionName: session.sessionName, isActive: session.isActive }); }}
                      style={{
                        color: '#000000',
                        backgroundColor: '#D4A017',
                        fontFamily: '"Fredoka", sans-serif',
                        fontSize: '12px',
                        padding: '8px 16px',
                        border: '1px solid #000000',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(session._id)}
                      style={{
                        color: '#FFFFFF',
                        backgroundColor: '#B22222',
                        fontFamily: '"Fredoka", sans-serif',
                        fontSize: '12px',
                        padding: '8px 16px',
                        border: '1px solid #000000',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style>
        {`
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
        `}
      </style>
    </div>
  );
};

export default SessionSchedules;