import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Papa from 'papaparse';

const Register = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState('single');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    surname: '',
    role: 'student',
    class: '',
    subjects: [],
  });
  const [editUserId, setEditUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchClasses();
      fetchUsers();
    }
  }, [user]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://waec-gfv0.onrender.com/api/classes', {
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
      const res = await axios.get('https://waec-gfv0.onrender.com/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users.');
    }
    setLoading(false);
  };

  const validateForm = () => {
    if (!formData.username) return 'Username is required.';
    if (!formData.password && !editUserId) return 'Password is required.';
    if (formData.password && (formData.password.length < 8 || !/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password))) {
      return 'Password must be at least 8 characters with one letter and one number.';
    }
    if (!formData.name) return 'Name is required.';
    if (!formData.surname) return 'Surname is required.';
    if (!formData.class) return 'Class is required.';
    return null;
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        subjects: formData.subjects.map(subject => ({ subject, class: formData.class })),
      };
      if (editUserId) {
        await axios.put(`https://waec-gfv0.onrender.com/api/auth/users/${editUserId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('User updated successfully.');
        setEditUserId(null);
      } else {
        await axios.post('https://waec-gfv0.onrender.com/api/auth/register', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('User registered successfully.');
      }
      setFormData({
        username: '',
        password: '',
        name: '',
        surname: '',
        role: 'student',
        class: '',
        subjects: [],
      });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process user.');
    }
    setLoading(false);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      setError('Please select a CSV file.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      Papa.parse(csvFile, {
        complete: async (result) => {
          const users = result.data.map(row => ({
            username: row.username,
            password: row.password,
            name: row.name,
            surname: row.surname,
            role: row.role,
            class: row.class,
            subjects: row.subjects ? row.subjects.split(';').map(subject => ({
              subject,
              class: row.class,
            })) : [],
          }));
          for (const user of users) {
            if (!user.username || !user.password || !user.name || !user.surname || !user.class) {
              throw new Error('Invalid CSV: Missing required fields.');
            }
            if (user.password.length < 8 || !/[a-zA-Z]/.test(user.password) || !/[0-9]/.test(user.password)) {
              throw new Error(`Invalid password for ${user.username}: Must be at least 8 characters with one letter and one number.`);
            }
          }
          const token = localStorage.getItem('token');
          const res = await axios.post('https://waec-gfv0.onrender.com/api/auth/register/bulk', { users }, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSuccess(`Registered ${res.data.count} users successfully.`);
          setCsvFile(null);
          fetchUsers();
        },
        header: true,
        skipEmptyLines: true,
        error: (err) => {
          setError('Failed to parse CSV file.');
          setLoading(false);
        },
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to register users.');
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditUserId(user._id);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      surname: user.surname,
      role: user.role,
      class: user.class,
      subjects: user.role === 'teacher' ? user.subjects.map(s => s.subject) : user.enrolledSubjects.map(s => s.subject),
    });
    setTab('single');
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://waec-gfv0.onrender.com/api/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('User deleted successfully.');
      fetchUsers();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user.');
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  const handleSubjectChange = (subject) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleDownloadTemplate = () => {
    const template = 'username,password,name,surname,role,class,subjects\nstudent1,Pass1234,John,Doe,student,SS1 Silver,Math;English\nteacher1,Pass1234,Mr,Smith,teacher,SS1 Silver,Math';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'user_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!user || user.role !== 'admin') return (
    <div style={{
      padding: '20px',
      color: '#D4A017',
      backgroundColor: '#b8c2cc',
      textAlign: 'center',
      fontFamily: '"Fredoka", sans-serif',
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
        Access restricted to admins.
      </div>
    </div>
  );
  if (loading) return (
    <div style={{
      padding: '20px',
      color: '#D4A017',
      backgroundColor: '#b8c2cc',
      textAlign: 'center',
      fontFamily: '"Fredoka", sans-serif',
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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#b8c2cc',
      padding: '20px',
      fontFamily: '"Fredoka", sans-serif',
      animation: 'slideIn 0.5s ease-out'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#4B5320',
        color: '#D4A017',
        padding: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '2rem',
        borderRadius: '8px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img 
              src="/uploads/sanni.png" 
              alt="Sanniville Academy" 
              style={{ height: '48px', border: '2px solid #D4A017', padding: '4px', backgroundColor: '#FFFFFF', borderRadius: '4px' }}
            />
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: '"Fredoka", sans-serif' }}>Sanniville Academy</h1>
              <span style={{ fontSize: '14px', fontFamily: '"Fredoka", sans-serif', color: '#F0E68C' }}>User Registration</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/admin')} 
            style={{
              padding: '8px 16px',
              backgroundColor: '#D4A017',
              color: '#4B5320',
              border: 'none',
              borderRadius: '4px',
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
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {error && (
          <div style={{
            backgroundColor: 'rgba(255, 230, 230, 0.9)',
            color: '#B22222',
            borderLeft: '4px solid #B22222',
            padding: '15px',
            marginBottom: '20px',
            fontFamily: '"Fredoka", sans-serif',
            borderRadius: '8px',
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
            animation: 'fadeIn 0.5s ease-out'
          }}>
            Success: {success}
          </div>
        )}

        {/* Navigation tabs */}
        <div style={{
          marginBottom: '20px',
          borderBottom: '2px solid #D3D3D3',
          paddingBottom: '10px',
          display: 'flex',
          gap: '10px'
        }}>
          {['single', 'bulk', 'edit'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '12px 24px',
                backgroundColor: tab === t ? '#D4A017' : '#4B5320',
                color: tab === t ? '#4B5320' : '#D4A017',
                border: 'none',
                borderRadius: '8px',
                fontFamily: '"Fredoka", sans-serif',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                if (tab !== t) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (tab !== t) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }
              }}
            >
              {t === 'single' ? 'Single User' : t === 'bulk' ? 'Bulk Upload' : 'Edit User'}
            </button>
          ))}
        </div>

        {/* Single User Registration */}
        {tab === 'single' && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '1px solid #D3D3D3',
            animation: 'slideUp 0.5s ease-out',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#4B5320',
              fontFamily: '"Fredoka", sans-serif',
              borderBottom: '1px solid #D3D3D3',
              paddingBottom: '10px',
              marginBottom: '20px'
            }}>
              {editUserId ? 'Edit User' : 'Register Single User'}
            </h3>
            <form onSubmit={handleSingleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px' }}>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Username</label>
                <input
                  type="text"
                  placeholder="e.g., johndoe"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  style={{
                    padding: '10px',
                    border: '1px solid #D3D3D3',
                    borderRadius: '6px',
                    width: '100%',
                    fontFamily: '"Fredoka", sans-serif',
                    fontSize: '14px',
                    transition: 'border-color 0.3s ease'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Password</label>
                <input
                  type="password"
                  placeholder="Min 8 chars, 1 letter, 1 number"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editUserId}
                  style={{
                    padding: '10px',
                    border: '1px solid #D3D3D3',
                    borderRadius: '6px',
                    width: '100%',
                    fontFamily: '"Fredoka", sans-serif',
                    fontSize: '14px',
                    transition: 'border-color 0.3s ease'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Name</label>
                <input
                  type="text"
                  placeholder="e.g., John"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    padding: '10px',
                    border: '1px solid #D3D3D3',
                    borderRadius: '6px',
                    width: '100%',
                    fontFamily: '"Fredoka", sans-serif',
                    fontSize: '14px',
                    transition: 'border-color 0.3s ease'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Surname</label>
                <input
                  type="text"
                  placeholder="e.g., Doe"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  required
                  style={{
                    padding: '10px',
                    border: '1px solid #D3D3D3',
                    borderRadius: '6px',
                    width: '100%',
                    fontFamily: '"Fredoka", sans-serif',
                    fontSize: '14px',
                    transition: 'border-color 0.3s ease'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  style={{
                    padding: '10px',
                    border: '1px solid #D3D3D3',
                    borderRadius: '6px',
                    width: '100%',
                    fontFamily: '"Fredoka", sans-serif',
                    fontSize: '14px',
                    transition: 'border-color 0.3s ease'
                  }}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Class</label>
                <select
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  required
                  style={{
                    padding: '10px',
                    border: '1px solid #D3D3D3',
                    borderRadius: '6px',
                    width: '100%',
                    fontFamily: '"Fredoka", sans-serif',
                    fontSize: '14px',
                    transition: 'border-color 0.3s ease'
                  }}
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls._id} value={cls.name}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Subjects</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {classes.find(cls => cls.name === formData.class)?.subjects.map(subject => (
                    <label key={subject} style={{ display: 'block', marginBottom: '5px' }}>
                      <input
                        type="checkbox"
                        checked={formData.subjects.includes(subject)}
                        onChange={() => handleSubjectChange(subject)}
                        style={{ marginRight: '5px' }}
                      />
                      <span style={{ color: '#333', fontFamily: '"Fredoka", sans-serif', fontSize: '14px' }}>{subject}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="submit" 
                  disabled={loading} 
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#D4A017',
                    color: '#4B5320',
                    border: 'none',
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
                  {editUserId ? 'Update User' : 'Register User'}
                </button>
                {editUserId && (
                  <button 
                    type="button" 
                    onClick={() => { setEditUserId(null); setFormData({ username: '', password: '', name: '', surname: '', role: 'student', class: '', subjects: [] }); }} 
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#D3D3D3',
                      color: '#333',
                      border: 'none',
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
        )}

        {/* Bulk User Registration */}
        {tab === 'bulk' && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '1px solid #D3D3D3',
            animation: 'slideUp 0.5s ease-out',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#4B5320',
              fontFamily: '"Fredoka", sans-serif',
              borderBottom: '1px solid #D3D3D3',
              paddingBottom: '10px',
              marginBottom: '20px'
            }}>
              Bulk User Registration
            </h3>
            <p style={{ color: '#333', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '15px' }}>
              Upload a CSV file with columns: username, password, name, surname, role, class, subjects (semicolon-separated, e.g., Math;English)
            </p>
            <button 
              onClick={handleDownloadTemplate} 
              style={{
                padding: '12px 24px',
                backgroundColor: '#D4A017',
                color: '#4B5320',
                border: 'none',
                borderRadius: '6px',
                fontFamily: '"Fredoka", sans-serif',
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '15px',
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
              Download CSV Template
            </button>
            <form onSubmit={handleBulkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px' }}>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  required
                  style={{
                    padding: '10px',
                    border: '1px solid #D3D3D3',
                    borderRadius: '6px',
                    width: '100%',
                    fontFamily: '"Fredoka", sans-serif',
                    fontSize: '14px',
                    transition: 'border-color 0.3s ease'
                  }}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#D4A017',
                  color: '#4B5320',
                  border: 'none',
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
                Upload and Register
              </button>
            </form>
          </div>
        )}

        {/* Edit User */}
        {tab === 'edit' && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '1px solid #D3D3D3',
            animation: 'slideUp 0.5s ease-out'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#4B5320',
              fontFamily: '"Fredoka", sans-serif',
              borderBottom: '1px solid #D3D3D3',
              paddingBottom: '10px',
              marginBottom: '20px'
            }}>
              Edit User
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #D3D3D3',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#4B5320', color: '#D4A017', fontFamily: '"Fredoka", sans-serif', fontSize: '12px' }}>
                    <th style={{ border: '1px solid #D3D3D3', padding: '12px' }}>Username</th>
                    <th style={{ border: '1px solid #D3D3D3', padding: '12px' }}>Name</th>
                    <th style={{ border: '1px solid #D3D3D3', padding: '12px' }}>Surname</th>
                    <th style={{ border: '1px solid #D3D3D3', padding: '12px' }}>Role</th>
                    <th style={{ border: '1px solid #D3D3D3', padding: '12px' }}>Class</th>
                    <th style={{ border: '1px solid #D3D3D3', padding: '12px' }}>Subjects</th>
                    <th style={{ border: '1px solid #D3D3D3', padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={user._id} style={{
                      color: '#333',
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
                      <td style={{ border: '1px solid #D3D3D3', padding: '12px' }}>{user.username}</td>
                      <td style={{ border: '1px solid #D3D3D3', padding: '12px' }}>{user.name}</td>
                      <td style={{ border: '1px solid #D3D3D3', padding: '12px' }}>{user.surname}</td>
                      <td style={{ border: '1px solid #D3D3D3', padding: '12px' }}>{user.role}</td>
                      <td style={{ border: '1px solid #D3D3D3', padding: '12px' }}>{user.class || 'N/A'}</td>
                      <td style={{ border: '1px solid #D3D3D3', padding: '12px' }}>
                        {(user.role === 'teacher' ? user.subjects : user.enrolledSubjects)
                          .map(s => `${s.subject} (${s.class})`)
                          .join(', ') || 'None'}
                      </td>
                      <td style={{ border: '1px solid #D3D3D3', padding: '12px', display: 'flex', gap: '5px' }}>
                        <button 
                          onClick={() => handleEditUser(user)} 
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#D4A017',
                            color: '#4B5320',
                            border: 'none',
                            borderRadius: '4px',
                            fontFamily: '"Fredoka", sans-serif',
                            fontSize: '12px',
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
                          onClick={() => handleDeleteUser(user._id)} 
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#B22222',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '4px',
                            fontFamily: '"Fredoka", sans-serif',
                            fontSize: '12px',
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
        )}
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

export default Register;