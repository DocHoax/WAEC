// src/pages/ManageClasses.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManageClasses = () => {
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [classForm, setClassForm] = useState({ name: '' });
  const [editClass, setEditClass] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ className: '', subject: '' });
  const [editSubject, setEditSubject] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('classes');

  useEffect(() => {
    fetchClasses();
    fetchUsers();
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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users.');
    }
    setLoading(false);
  };

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (editClass) {
        await axios.put(`http://localhost:5000/api/classes/${editClass._id}`, classForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('Class updated successfully.');
        setEditClass(null);
      } else {
        await axios.post('http://localhost:5000/api/classes', classForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('Class created successfully.');
      }
      fetchClasses();
      setClassForm({ name: '' });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process class.');
    }
    setLoading(false);
  };

  const handleClassDelete = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Class deleted successfully.');
      fetchClasses();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete class.');
    }
    setLoading(false);
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (editSubject) {
        await axios.put(`http://localhost:5000/api/classes/subject/${editSubject.classId}`, {
          oldSubject: editSubject.subject,
          newSubject: subjectForm.subject,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('Subject updated successfully.');
        setEditSubject(null);
      } else {
        await axios.post('http://localhost:5000/api/classes/subject', subjectForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('Subject added successfully.');
      }
      fetchClasses();
      setSubjectForm({ className: '', subject: '' });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process subject.');
    }
    setLoading(false);
  };

  const handleSubjectDelete = async (classId, subject) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/classes/subject/${classId}/${subject}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Subject deleted successfully.');
      fetchClasses();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete subject.');
    }
    setLoading(false);
  };

  if (loading) return <p style={{ padding: '20px', color: '#FFFFFF', backgroundColor: '#4B5320', textAlign: 'center', fontFamily: 'sans-serif', fontSize: '16px' }}>Loading...</p>;

  return (
    <div>
      {error && <p style={{ backgroundColor: '#FFF3F3', color: '#B22222', borderLeft: '4px solid #B22222', padding: '15px', marginBottom: '20px', fontFamily: 'sans-serif', borderRadius: '4px', fontSize: '14px' }}>Error: {error}</p>}
      {success && <p style={{ backgroundColor: '#E6FFE6', color: '#228B22', borderLeft: '4px solid #228B22', padding: '15px', marginBottom: '20px', fontFamily: 'sans-serif', borderRadius: '4px', fontSize: '14px' }}>Success: {success}</p>}

      <div style={{ marginBottom: '20px', borderBottom: '2px solid #E0E0E0', paddingBottom: '10px' }}>
        <button
          onClick={() => setTab('classes')}
          style={{
            marginRight: '10px',
            padding: '8px 16px',
            backgroundColor: tab === 'classes' ? '#D4A017' : '#4B5320',
            color: tab === 'classes' ? '#000000' : '#FFFFFF',
            border: '1px solid #000000',
            borderRadius: '6px',
            fontFamily: 'sans-serif',
            fontSize: '14px',
            cursor: 'pointer',
          }}
          onMouseOver={e => e.target.style.backgroundColor = tab === 'classes' ? '#FFFFFF' : '#5A6B2A'}
          onMouseOut={e => e.target.style.backgroundColor = tab === 'classes' ? '#D4A017' : '#4B5320'}
        >
          Manage Classes
        </button>
        <button
          onClick={() => setTab('subjects')}
          style={{
            padding: '8px 16px',
            backgroundColor: tab === 'subjects' ? '#D4A017' : '#4B5320',
            color: tab === 'subjects' ? '#000000' : '#FFFFFF',
            border: '1px solid #000000',
            borderRadius: '6px',
            fontFamily: 'sans-serif',
            fontSize: '14px',
            cursor: 'pointer',
          }}
          onMouseOver={e => e.target.style.backgroundColor = tab === 'subjects' ? '#FFFFFF' : '#5A6B2A'}
          onMouseOut={e => e.target.style.backgroundColor = tab === 'subjects' ? '#D4A017' : '#4B5320'}
        >
          Manage Subjects
        </button>
      </div>

      {tab === 'classes' && (
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #E0E0E0' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'sans-serif', backgroundColor: '#4B5320', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
            {editClass ? 'Edit Class Details' : 'Create a New Class'}
          </h3>
          <form onSubmit={handleClassSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', maxWidth: '400px' }}>
            <div>
              <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Class Name</label>
              <input
                type="text"
                placeholder="e.g., SS1 Silver"
                value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
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
                {editClass ? 'Update Class' : 'Create Class'}
              </button>
              {editClass && (
                <button
                  type="button"
                  onClick={() => setEditClass(null)}
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
            All Classes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {classes.map((cls) => (
              <div key={cls._id} style={{ border: '1px solid #E0E0E0', padding: '15px', backgroundColor: '#F5F5F5', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#4B5320', fontFamily: 'sans-serif' }}>{cls.name}</h4>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => { setEditClass(cls); setClassForm({ name: cls.name }); }}
                      style={{ color: '#000000', backgroundColor: '#D4A017', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleClassDelete(cls._id)}
                      style={{ color: '#FFFFFF', backgroundColor: '#B22222', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p style={{ color: '#000000', fontSize: '14px', marginBottom: '10px', fontFamily: 'sans-serif' }}>
                  <span style={{ fontWeight: 'bold' }}>Subjects:</span> {cls.subjects.join(', ') || 'No subjects assigned'}
                </p>
                <h5 style={{ color: '#4B5320', fontSize: '14px', fontFamily: 'sans-serif', marginBottom: '10px' }}>Enrolled Students</h5>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E0E0E0' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#4B5320', color: '#FFFFFF', fontFamily: 'sans-serif', fontSize: '12px' }}>
                        <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>ID</th>
                        <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Name</th>
                        <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Surname</th>
                        <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Subjects</th>
                        <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Records</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter((u) => u.class === cls.name && u.role === 'student')
                        .map((student) => (
                          <tr key={student._id} style={{ color: '#000000', fontFamily: 'sans-serif', fontSize: '12px' }}>
                            <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{student.username}</td>
                            <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{student.name}</td>
                            <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{student.surname}</td>
                            <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                              {student.enrolledSubjects?.map((s) => s.subject).join(', ') || 'No subjects enrolled'}
                            </td>
                            <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                              <button
                                style={{ color: '#000000', backgroundColor: '#D4A017', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                View Records
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'subjects' && (
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #E0E0E0' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'sans-serif', backgroundColor: '#4B5320', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
            {editSubject ? 'Edit Subject Details' : 'Add a New Subject'}
          </h3>
          <form onSubmit={handleSubjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', maxWidth: '400px' }}>
            <div>
              <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Class</label>
              <select
                value={subjectForm.className}
                onChange={(e) => setSubjectForm({ ...subjectForm, className: e.target.value })}
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
              <input
                type="text"
                placeholder="e.g., Biology"
                value={subjectForm.subject}
                onChange={(e) => setSubjectForm({ ...subjectForm, subject: e.target.value })}
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
                {editSubject ? 'Update Subject' : 'Add Subject'}
              </button>
              {editSubject && (
                <button
                  type="button"
                  onClick={() => setEditSubject(null)}
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
            All Subjects
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {classes.map((cls) => (
              <div key={cls._id} style={{ border: '1px solid #E0E0E0', padding: '15px', backgroundColor: '#F5F5F5', borderRadius: '4px' }}>
                <h4 style={{ fontSize: '16px', color: '#4B5320', fontFamily: 'sans-serif', marginBottom: '10px' }}>{cls.name}</h4>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cls.subjects.map((subject) => (
                    <li key={subject} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '8px', borderRadius: '4px', border: '1px solid #E0E0E0' }}>
                      <span style={{ color: '#000000', fontFamily: 'sans-serif', fontSize: '14px' }}>{subject}</span>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => { setEditSubject({ classId: cls._id, subject }); setSubjectForm({ className: cls.name, subject }); }}
                          style={{ color: '#000000', backgroundColor: '#D4A017', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleSubjectDelete(cls._id, subject)}
                          style={{ color: '#FFFFFF', backgroundColor: '#B22222', fontFamily: 'sans-serif', fontSize: '12px', padding: '5px 10px', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageClasses;