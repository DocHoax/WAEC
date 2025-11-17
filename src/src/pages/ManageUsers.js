import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';

const ManageUsers = () => {
  const [tab, setTab] = useState('single');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    surname: '',
    role: 'student',
    class: '',
    subjects: [],
    picture: null,
    dateOfBirth: '',
    address: '',
    phoneNumber: '',
    sex: '',
    age: '',
  });
  const [editUserId, setEditUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchUsers();
  }, []);

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
    if (!formData.dateOfBirth) return 'Date of birth is required.';
    if (!formData.address) return 'Address is required.';
    if (!formData.phoneNumber) return 'Phone number is required.';
    if (!formData.sex) return 'Sex is required.';
    if (!formData.age || formData.age < 1) return 'Valid age is required.';
    if (!editUserId && !formData.picture) return 'Profile picture is required.';
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
      const formDataToSend = new FormData();
      formDataToSend.append('username', formData.username);
      if (formData.password) formDataToSend.append('password', formData.password);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('surname', formData.surname);
      formDataToSend.append('role', formData.role);
      formDataToSend.append('class', formData.class);
      formDataToSend.append('subjects', JSON.stringify(formData.subjects.map(subject => ({ subject, class: formData.class }))));
      if (formData.picture) formDataToSend.append('picture', formData.picture);
      formDataToSend.append('dateOfBirth', formData.dateOfBirth);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('phoneNumber', formData.phoneNumber);
      formDataToSend.append('sex', formData.sex);
      formDataToSend.append('age', formData.age);

      if (editUserId) {
        await axios.put(`https://waec-gfv0.onrender.com/api/auth/users/${editUserId}`, formDataToSend, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
        setSuccess('User updated successfully.');
        setEditUserId(null);
      } else {
        await axios.post('https://waec-gfv0.onrender.com/api/auth/register', formDataToSend, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
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
        picture: null,
        dateOfBirth: '',
        address: '',
        phoneNumber: '',
        sex: '',
        age: '',
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
            picture: row.picture || '',
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
      picture: null,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
      address: user.address || '',
      phoneNumber: user.phoneNumber || '',
      sex: user.sex || '',
      age: user.age || '',
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

  const handlePictureChange = (e) => {
    setFormData({ ...formData, picture: e.target.files[0] });
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
    const template = 'username,password,name,surname,role,class,subjects,picture\nstudent1,Pass1234,John,Doe,student,SS1 Silver,Math;English,student1.jpg\nteacher1,Pass1234,Mr,Smith,teacher,SS1 Silver,Math,teacher1.jpg';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'user_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) return (
    <div style={{ 
      padding: '20px', 
      color: '#FFFFFF', 
      backgroundColor: '#4B5320', 
      textAlign: 'center', 
      fontFamily: '"Fredoka", sans-serif', 
      fontSize: '16px',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      Loading...
    </div>
  );

  return (
    <div style={{
      backgroundColor: '#b8c2cc',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: '"Fredoka", sans-serif'
    }}>
      {error && (
        <div style={{ 
          backgroundColor: '#FFF3F3', 
          color: '#B22222', 
          borderLeft: '4px solid #B22222', 
          padding: '15px', 
          marginBottom: '20px', 
          fontFamily: '"Fredoka", sans-serif', 
          borderRadius: '4px', 
          fontSize: '14px',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          Error: {error}
        </div>
      )}
      {success && (
        <div style={{ 
          backgroundColor: '#E6FFE6', 
          color: '#228B22', 
          borderLeft: '4px solid #228B22', 
          padding: '15px', 
          marginBottom: '20px', 
          fontFamily: '"Fredoka", sans-serif', 
          borderRadius: '4px', 
          fontSize: '14px',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          Success: {success}
        </div>
      )}

      <div style={{ 
        marginBottom: '20px', 
        borderBottom: '2px solid #E0E0E0', 
        paddingBottom: '10px',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        {['single', 'bulk', 'edit'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px',
              backgroundColor: tab === t ? '#D4A017' : '#4B5320',
              color: tab === t ? '#000000' : '#FFFFFF',
              border: '1px solid #000000',
              borderRadius: '6px',
              fontFamily: '"Fredoka", sans-serif',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.target.style.transform = 'translateY(0)'}
          >
            {t === 'single' ? 'Single User' : t === 'bulk' ? 'Bulk Upload' : 'Edit User'}
          </button>
        ))}
      </div>

      {tab === 'single' && (
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          padding: '30px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
          border: '1px solid #E0E0E0',
          animation: 'slideInUp 0.5s ease-out'
        }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: '#FFFFFF', 
            fontFamily: '"Fredoka", sans-serif', 
            backgroundColor: '#4B5320', 
            padding: '12px', 
            borderRadius: '6px', 
            marginBottom: '20px' 
          }}>
            {editUserId ? 'Edit User' : 'Register Single User'}
          </h3>
          <form onSubmit={handleSingleSubmit} style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
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
                  border: '1px solid #000000', 
                  borderRadius: '4px', 
                  width: '100%', 
                  fontFamily: '"Fredoka", sans-serif', 
                  fontSize: '14px', 
                  backgroundColor: '#F5F5F5', 
                  color: '#000000' 
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
                  border: '1px solid #000000', 
                  borderRadius: '4px', 
                  width: '100%', 
                  fontFamily: '"Fredoka", sans-serif', 
                  fontSize: '14px', 
                  backgroundColor: '#F5F5F5', 
                  color: '#000000' 
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
                  border: '1px solid #000000', 
                  borderRadius: '4px', 
                  width: '100%', 
                  fontFamily: '"Fredoka", sans-serif', 
                  fontSize: '14px', 
                  backgroundColor: '#F5F5F5', 
                  color: '#000000' 
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
                  border: '1px solid #000000', 
                  borderRadius: '4px', 
                  width: '100%', 
                  fontFamily: '"Fredoka", sans-serif', 
                  fontSize: '14px', 
                  backgroundColor: '#F5F5F5', 
                  color: '#000000' 
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
                  border: '1px solid #000000', 
                  borderRadius: '4px', 
                  width: '100%', 
                  fontFamily: '"Fredoka", sans-serif', 
                  fontSize: '14px', 
                  backgroundColor: '#F5F5F5', 
                  color: '#000000' 
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
                  border: '1px solid #000000', 
                  borderRadius: '4px', 
                  width: '100%', 
                  fontFamily: '"Fredoka", sans-serif', 
                  fontSize: '14px', 
                  backgroundColor: '#F5F5F5', 
                  color: '#000000' 
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                {classes.find(cls => cls.name === formData.class)?.subjects?.map(subject => (
                  <label key={subject} style={{ display: 'block', marginBottom: '5px' }}>
                    <input
                      type="checkbox"
                      checked={formData.subjects.includes(subject)}
                      onChange={() => handleSubjectChange(subject)}
                      style={{ marginRight: '5px' }}
                    />
                    <span style={{ color: '#000000', fontFamily: '"Fredoka", sans-serif', fontSize: '14px' }}>{subject}</span>
                  </label>
                )) || <p style={{ color: '#666', fontFamily: '"Fredoka", sans-serif', fontSize: '14px' }}>Select a class to view subjects</p>}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Profile Picture</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handlePictureChange}
                required={!editUserId}
                style={{ 
                  padding: '10px', 
                  border: '1px solid #000000', 
                  borderRadius: '4px', 
                  width: '100%', 
                  fontFamily: '"Fredoka", sans-serif', 
                  fontSize: '14px', 
                  backgroundColor: '#F5F5F5', 
                  color: '#000000' 
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                required
                style={{ 
                  padding: '10px', 
                  border: '1px solid #000000', 
                  borderRadius: '4px', 
                  width: '100%', 
                  fontFamily: '"Fredoka", sans-serif', 
                  fontSize: '14px', 
                  backgroundColor: '#F5F5F5', 
                  color: '#000000' 
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Address</label>
              <input
                type="text"
                placeholder="e.g., 123 Main St"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                style={{ 
                  padding: '10px', 
                  border: '1px solid #000000', 
                  borderRadius: '4px', 
                  width: '100%', 
                  fontFamily: '"Fredoka", sans-serif', 
                  fontSize: '14px', 
                  backgroundColor: '#F5F5F5', 
                  color: '#000000' 
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Phone Number</label>
              <input
                type="tel"
                placeholder="e.g., +2341234567890"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
                style={{ 
                  padding: '10px', 
                  border: '1px solid #000000', 
                  borderRadius: '4px', 
                  width: '100%', 
                  fontFamily: '"Fredoka", sans-serif', 
                  fontSize: '14px', 
                  backgroundColor: '#F5F5F5', 
                  color: '#000000' 
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Sex</label>
              <select
                value={formData.sex}
                onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                required
                style={{ 
                  padding: '10px', 
                  border: '1px solid #000000', 
                  borderRadius: '4px', 
                  width: '100%', 
                  fontFamily: '"Fredoka", sans-serif', 
                  fontSize: '14px', 
                  backgroundColor: '#F5F5F5', 
                  color: '#000000' 
                }}
              >
                <option value="">Select Sex</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#4B5320', fontFamily: '"Fredoka", sans-serif', fontSize: '14px', marginBottom: '5px' }}>Age</label>
              <input
                type="number"
                placeholder="e.g., 25"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
                min="1"
                style={{ 
                  padding: '10px', 
                  border: '1px solid #000000', 
                  borderRadius: '4px', 
                  width: '100%', 
                  fontFamily: '"Fredoka", sans-serif', 
                  fontSize: '14px', 
                  backgroundColor: '#F5F5F5', 
                  color: '#000000' 
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', gridColumn: '1 / -1' }}>
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
                onMouseOver={e => !loading && (e.target.style.transform = 'translateY(-2px)')}
                onMouseOut={e => !loading && (e.target.style.transform = 'translateY(0)')}
              >
                {editUserId ? 'Update User' : 'Register User'}
              </button>
              {editUserId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditUserId(null);
                    setFormData({ username: '', password: '', name: '', surname: '', role: 'student', class: '', subjects: [], picture: null, dateOfBirth: '', address: '', phoneNumber: '', sex: '', age: '' });
                  }}
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
                  onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.target.style.transform = 'translateY(0)'}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {tab === 'bulk' && (
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          padding: '30px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
          border: '1px solid #E0E0E0',
          animation: 'slideInUp 0.5s ease-out'
        }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: '#FFFFFF', 
            fontFamily: '"Fredoka", sans-serif', 
            backgroundColor: '#4B5320', 
            padding: '12px', 
            borderRadius: '6px', 
            marginBottom: '20px' 
          }}>
            Bulk User Registration
          </h3>
          <p style={{ 
            color: '#000000', 
            fontFamily: '"Fredoka", sans-serif', 
            fontSize: '14px', 
            marginBottom: '15px' 
          }}>
            Upload a CSV file with columns: username, password, name, surname, role, class, subjects (semicolon-separated, e.g., Math;English), picture (filename, e.g., student1.jpg). Ensure images are in the backend uploads folder.
          </p>
          <button
            onClick={handleDownloadTemplate}
            style={{
              padding: '10px 20px',
              backgroundColor: '#D4A017',
              color: '#000000',
              border: '1px solid #000000',
              borderRadius: '6px',
              fontFamily: '"Fredoka", sans-serif',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '15px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.target.style.transform = 'translateY(0)'}
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
                  border: '1px solid #000000', 
                  borderRadius: '4px', 
                  width: '100%', 
                  fontFamily: '"Fredoka", sans-serif', 
                  fontSize: '14px', 
                  backgroundColor: '#F5F5F5', 
                  color: '#000000' 
                }}
              />
            </div>
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
              onMouseOver={e => !loading && (e.target.style.transform = 'translateY(-2px)')}
              onMouseOut={e => !loading && (e.target.style.transform = 'translateY(0)')}
            >
              Upload and Register
            </button>
          </form>
        </div>
      )}

      {tab === 'edit' && (
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          padding: '30px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
          border: '1px solid #E0E0E0',
          animation: 'slideInUp 0.5s ease-out'
        }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: '#FFFFFF', 
            fontFamily: '"Fredoka", sans-serif', 
            backgroundColor: '#4B5320', 
            padding: '12px', 
            borderRadius: '6px', 
            marginBottom: '20px' 
          }}>
            Edit User
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              border: '1px solid #E0E0E0',
              animation: 'fadeIn 0.5s ease-out'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#4B5320', color: '#FFFFFF', fontFamily: '"Fredoka", sans-serif', fontSize: '12px' }}>
                  <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Username</th>
                  <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Name</th>
                  <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Surname</th>
                  <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Role</th>
                  <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Class</th>
                  <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Subjects</th>
                  <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Picture</th>
                  <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Date of Birth</th>
                  <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Address</th>
                  <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Phone Number</th>
                  <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Sex</th>
                  <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Age</th>
                  <th style={{ border: '1px solid #E0E0E0', padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr 
                    key={user._id} 
                    style={{ 
                      color: '#000000', 
                      fontFamily: '"Fredoka", sans-serif', 
                      fontSize: '12px',
                      animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`
                    }}
                  >
                    <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>{user.username}</td>
                    <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>{user.name}</td>
                    <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>{user.surname}</td>
                    <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>{user.role}</td>
                    <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>{user.class || 'N/A'}</td>
                    <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>
                      {(user.role === 'teacher' ? user.subjects : user.enrolledSubjects)
                        .map(s => `${s.subject} (${s.class})`)
                        .join(', ') || 'None'}
                    </td>
                    <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>
                      {user.picture ? <img src={`https://waec-gfv0.onrender.com/uploads/${user.picture}`} alt="Profile" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} /> : 'None'}
                    </td>
                    <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'N/A'}</td>
                    <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>{user.address || 'N/A'}</td>
                    <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>{user.phoneNumber || 'N/A'}</td>
                    <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>{user.sex || 'N/A'}</td>
                    <td style={{ border: '1px solid #E0E0E0', padding: '12px' }}>{user.age || 'N/A'}</td>
                    <td style={{ border: '1px solid #E0E0E0', padding: '12px', display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEditUser(user)}
                        style={{ 
                          color: '#000000', 
                          backgroundColor: '#D4A017', 
                          fontFamily: '"Fredoka", sans-serif', 
                          fontSize: '12px', 
                          padding: '8px 12px', 
                          border: '1px solid #000000', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={e => e.target.style.transform = 'translateY(0)'}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        style={{ 
                          color: '#FFFFFF', 
                          backgroundColor: '#B22222', 
                          fontFamily: '"Fredoka", sans-serif', 
                          fontSize: '12px', 
                          padding: '8px 12px', 
                          border: '1px solid #000000', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={e => e.target.style.transform = 'translateY(0)'}
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
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slideInUp {
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

export default ManageUsers;