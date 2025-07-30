import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ExamSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [formData, setFormData] = useState({ className: '', subject: '', date: '', time: '' });
  const [editSchedule, setEditSchedule] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchClasses();
    fetchSchedules();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load classes.');
    }
    setLoading(false);
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/exams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSchedules(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load schedules.');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (editSchedule) {
        await axios.put(`http://localhost:5000/api/exams/${editSchedule._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('Schedule updated successfully.');
        setEditSchedule(null);
      } else {
        await axios.post('http://localhost:5000/api/exams', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('Schedule created successfully.');
      }
      setFormData({ className: '', subject: '', date: '', time: '' });
      fetchSchedules();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process schedule.');
    }
    setLoading(false);
  };

  const handleDelete = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/exams/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Schedule deleted successfully.');
      fetchSchedules();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete schedule.');
    }
    setLoading(false);
  };

  if (loading) return <p style={{ padding: '20px', color: '#FFFFFF', backgroundColor: '#4B5320', textAlign: 'center', fontFamily: 'sans-serif', fontSize: '16px' }}>Loading...</p>;

  return (
    <div>
      {error && <p style={{ backgroundColor: '#FFF3F3', color: '#B22222', borderLeft: '4px solid #B22222', padding: '15px', marginBottom: '20px', fontFamily: 'sans-serif', borderRadius: '4px', fontSize: '14px' }}>Error: {error}</p>}
      {success && <p style={{ backgroundColor: '#E6FFE6', color: '#228B22', borderLeft: '4px solid #228B22', padding: '15px', marginBottom: '20px', fontFamily: 'sans-serif', borderRadius: '4px', fontSize: '14px' }}>Success: {success}</p>}

      <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'sans-serif', backgroundColor: '#4B5320', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
        {editSchedule ? 'Edit Exam Schedule' : 'Create Exam Schedule'}
      </h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Class</label>
          <select
            value={formData.className}
            onChange={(e) => setFormData({ ...formData, className: e.target.value })}
            required
            style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
          >
            <option value="">Select Class</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls.name}>{cls.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Subject</label>
          <select
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
            style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
          >
            <option value="">Select Subject</option>
            {formData.className && classes.find(cls => cls.name === formData.className)?.subjects.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Time</label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
            style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
          />
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
            {editSchedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
          {editSchedule && (
            <button
              type="button"
              onClick={() => { setEditSchedule(null); setFormData({ className: '', subject: '', date: '', time: '' }); }}
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
        All Exam Schedules
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E0E0E0' }}>
          <thead>
            <tr style={{ backgroundColor: '#4B5320', color: '#FFFFFF', fontFamily: 'sans-serif', fontSize: '12px' }}>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Class</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Subject</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Date</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Time</th>
              <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => (
              <tr key={schedule._id} style={{ color: '#000000', fontFamily: 'sans-serif', fontSize: '12px' }}>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{schedule.className}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{schedule.subject}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{new Date(schedule.date).toLocaleDateString()}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{schedule.time}</td>
                <td style={{ border: '1px solid #E0E0E0', padding: '8px', display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => { setEditSchedule(schedule); setFormData({ className: schedule.className, subject: schedule.subject, date: schedule.date.split('T')[0], time: schedule.time }); }}
                    style={{ color: '#000000', backgroundColor: '#D4A017', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(schedule._id)}
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

export default ExamSchedules;