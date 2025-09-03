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

  if (loading) return <p style={{ padding: '20px', color: '#FFFFFF', backgroundColor: '#4B5320', textAlign: 'center', fontFamily: 'sans-serif', fontSize: '16px' }}>Loading...</p>;

  if (user.role !== 'admin') return <p style={{ padding: '20px', color: '#B22222', backgroundColor: '#FFF3F3', textAlign: 'center', fontFamily: 'sans-serif', fontSize: '16px' }}>Admin access required.</p>;

  return (
    <div>
      {error && <p style={{ backgroundColor: '#FFF3F3', color: '#B22222', borderLeft: '4px solid #B22222', padding: '15px', marginBottom: '20px', fontFamily: 'sans-serif', borderRadius: '4px', fontSize: '14px' }}>Error: {error}</p>}
      {success && <p style={{ backgroundColor: '#E6FFE6', color: '#228B22', borderLeft: '4px solid #228B22', padding: '15px', marginBottom: '20px', fontFamily: 'sans-serif', borderRadius: '4px', fontSize: '14px' }}>Success: {success}</p>}

      <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'sans-serif', backgroundColor: '#4B5320', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
        {editSession ? 'Edit Session' : 'Create Session'}
      </h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Session Name</label>
          <input
            type="text"
            value={formData.sessionName}
            onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
            required
            placeholder="e.g., 2025/2026 First Term"
            style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            style={{ width: '18px', height: '18px' }}
          />
          <label style={{ color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px' }}>Set as Active Session</label>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#D4A017',
              color: '#000000',
              border: '1px solid #000000',
              borderRadius: '6px',
              fontFamily: 'sans-serif',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {editSession ? 'Update Session' : 'Create Session'}
          </button>
          {editSession && (
            <button
              type="button"
              onClick={() => { setEditSession(null); setFormData({ sessionName: '', isActive: false }); }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#FFFFFF',
                color: '#000000',
                border: '1px solid #000000',
                borderRadius: '6px',
                fontFamily: 'sans-serif',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'sans-serif', backgroundColor: '#4B5320', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
        All Sessions
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E0E0E0' }}>
          <thead>
            <tr style={{ backgroundColor: '#4B5320', color: '#FFFFFF', fontFamily: 'sans-serif', fontSize: '12px' }}>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Session Name</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Active</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session._id} style={{ color: '#000000', fontFamily: 'sans-serif', fontSize: '12px' }}>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{session.sessionName}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{session.isActive ? 'Yes' : 'No'}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px', display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => { setEditSession(session); setFormData({ sessionName: session.sessionName, isActive: session.isActive }); }}
                    style={{ color: '#000000', backgroundColor: '#D4A017', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(session._id)}
                    style={{ color: '#FFFFFF', backgroundColor: '#B22222', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
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
  );
};

export default SessionSchedules;