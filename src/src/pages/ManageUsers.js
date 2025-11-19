import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';

const ManageUsers = () => {
  const [tab, setTab] = useState('view');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    name: '',
    surname: '',
    role: 'student',
    class: '',
    studentId: '',
    subjects: [],
    picture: null,
    dateOfBirth: '',
    address: '',
    phoneNumber: '',
    sex: '',
    age: '',
    active: true,
    adminPermissions: []
  });
  const [editUserId, setEditUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Admin permissions options
  const adminPermissionOptions = [
    { value: 'MANAGE_USERS', label: 'Manage Users' },
    { value: 'APPROVE_TESTS', label: 'Approve Tests' },
    { value: 'MANAGE_RESULTS', label: 'Manage Results' },
    { value: 'SYSTEM_CONFIG', label: 'System Configuration' },
    { value: 'VIEW_ANALYTICS', label: 'View Analytics' },
    { value: 'MANAGE_ADMINS', label: 'Manage Admins' }
  ];

  useEffect(() => {
    fetchCurrentUser();
    fetchClasses();
    fetchUsers();
  }, []);

  const fetchCurrentUser = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const userData = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(userData);
      } catch (err) {
        console.error('Error parsing token:', err);
      }
    }
  };

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
      console.error('Error fetching classes:', err);
      setError(err.response?.data?.error || 'Failed to load classes.');
    }
    setLoading(false);
  };

  // FIXED: Use the correct API endpoint from your routes
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching users from API...');
      
      // Try multiple possible endpoints
      let usersData = [];
      
      try {
        // First try the main users endpoint
        const res = await axios.get('https://waec-gfv0.onrender.com/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        usersData = res.data.users || res.data;
        console.log('Users fetched from /api/users:', usersData);
      } catch (firstError) {
        console.log('First endpoint failed, trying auth endpoint...');
        
        // Try the auth endpoint as fallback
        const res = await axios.get('https://waec-gfv0.onrender.com/api/auth/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        usersData = res.data;
        console.log('Users fetched from /api/auth/users:', usersData);
      }

      if (Array.isArray(usersData)) {
        setUsers(usersData);
        setError(null);
      } else {
        console.error('Invalid users data format:', usersData);
        setError('Invalid data format received from server.');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load users. Please check your permissions.');
    }
    setLoading(false);
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDateOfBirthChange = (dateString) => {
    const age = calculateAge(dateString);
    setFormData(prev => ({
      ...prev,
      dateOfBirth: dateString,
      age: age || ''
    }));
  };

  const validateForm = () => {
    if (!formData.username) return 'Username is required.';
    if (!formData.email) return 'Email is required.';
    if (!formData.password && !editUserId) return 'Password is required.';
    if (formData.password && (formData.password.length < 6)) {
      return 'Password must be at least 6 characters.';
    }
    if (!formData.name) return 'Name is required.';
    if (!formData.surname) return 'Surname is required.';
    if (formData.role === 'student' && !formData.class) return 'Class is required for students.';
    
    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Please enter a valid email address.';
    }

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
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.name,
        surname: formData.surname,
        role: formData.role,
        active: formData.active,
        class: formData.class || undefined,
        studentId: formData.studentId || undefined,
        subjects: formData.subjects.length > 0 ? formData.subjects.map(subject => ({ subject, class: formData.class })) : [],
        dateOfBirth: formData.dateOfBirth || undefined,
        address: formData.address || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        sex: formData.sex || undefined,
        age: formData.age || undefined,
        adminPermissions: formData.role === 'admin' ? formData.adminPermissions : []
      };

      console.log('Submitting user data:', userData);

      let response;
      if (editUserId) {
        // For updates, use FormData if there's a picture, otherwise use JSON
        if (formData.picture) {
          const formDataToSend = new FormData();
          Object.keys(userData).forEach(key => {
            if (key === 'subjects' || key === 'adminPermissions') {
              formDataToSend.append(key, JSON.stringify(userData[key]));
            } else if (userData[key] !== undefined) {
              formDataToSend.append(key, userData[key]);
            }
          });
          formDataToSend.append('picture', formData.picture);
          
          response = await axios.put(`https://waec-gfv0.onrender.com/api/users/${editUserId}`, formDataToSend, {
            headers: { 
              Authorization: `Bearer ${token}`, 
              'Content-Type': 'multipart/form-data' 
            },
          });
        } else {
          response = await axios.put(`https://waec-gfv0.onrender.com/api/users/${editUserId}`, userData, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        setSuccess('User updated successfully.');
        setEditUserId(null);
      } else {
        // For new users, always use FormData to include picture
        const formDataToSend = new FormData();
        Object.keys(userData).forEach(key => {
          if (key === 'subjects' || key === 'adminPermissions') {
            formDataToSend.append(key, JSON.stringify(userData[key]));
          } else if (userData[key] !== undefined) {
            formDataToSend.append(key, userData[key]);
          }
        });
        if (formData.picture) {
          formDataToSend.append('picture', formData.picture);
        }
        
        // Try both endpoints for user creation
        try {
          response = await axios.post('https://waec-gfv0.onrender.com/api/users', formDataToSend, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
          });
        } catch (createError) {
          console.log('First create endpoint failed, trying auth endpoint...');
          response = await axios.post('https://waec-gfv0.onrender.com/api/auth/register', formDataToSend, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
          });
        }
        setSuccess('User created successfully.');
      }
      
      // Reset form
      setFormData({
        username: '',
        password: '',
        email: '',
        name: '',
        surname: '',
        role: 'student',
        class: '',
        studentId: '',
        subjects: [],
        picture: null,
        dateOfBirth: '',
        address: '',
        phoneNumber: '',
        sex: '',
        age: '',
        active: true,
        adminPermissions: []
      });
      
      // Refresh users list
      fetchUsers();
    } catch (err) {
      console.error('Error creating/updating user:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to process user. Please check the console for details.');
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
          const users = result.data.filter(row => row.username && row.email).map(row => {
            const dateOfBirth = row.dateOfBirth || '';
            const age = dateOfBirth ? calculateAge(dateOfBirth) : row.age || '';
            
            return {
              username: row.username,
              password: row.password,
              email: row.email,
              name: row.name,
              surname: row.surname,
              role: row.role || 'student',
              class: row.class,
              studentId: row.studentId,
              subjects: row.subjects ? row.subjects.split(';').map(subject => ({
                subject: subject.trim(),
                class: row.class,
              })) : [],
              picture: row.picture || '',
              dateOfBirth: dateOfBirth,
              address: row.address || '',
              phoneNumber: row.phoneNumber || '',
              sex: row.sex || '',
              age: age,
              active: row.active !== 'false',
              adminPermissions: row.adminPermissions ? row.adminPermissions.split(';') : []
            };
          });
          
          if (users.length === 0) {
            throw new Error('No valid user data found in CSV file.');
          }
          
          // Validate each user
          for (const user of users) {
            if (!user.username || !user.password || !user.email || !user.name || !user.surname) {
              throw new Error(`Invalid CSV: Missing required fields for user ${user.username || 'unknown'}.`);
            }
            if (user.password.length < 6) {
              throw new Error(`Invalid password for ${user.username}: Must be at least 6 characters.`);
            }
            if (user.role === 'student' && !user.class) {
              throw new Error(`Student ${user.username} must have a class assigned.`);
            }
          }
          
          const token = localStorage.getItem('token');
          console.log('Bulk creating users:', users);
          
          // Try bulk endpoint, fallback to individual creation
          try {
            const res = await axios.post('https://waec-gfv0.onrender.com/api/users/bulk', { users }, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setSuccess(`Created ${res.data.count} users successfully.`);
          } catch (bulkError) {
            console.log('Bulk endpoint failed, creating users individually...');
            
            let successCount = 0;
            for (const user of users) {
              try {
                await axios.post('https://waec-gfv0.onrender.com/api/users', user, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                successCount++;
              } catch (individualError) {
                console.error(`Failed to create user ${user.username}:`, individualError);
              }
            }
            setSuccess(`Created ${successCount} out of ${users.length} users successfully.`);
          }
          
          setCsvFile(null);
          fetchUsers();
        },
        header: true,
        skipEmptyLines: true,
        error: (err) => {
          setError('Failed to parse CSV file: ' + err.message);
          setLoading(false);
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create users.');
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditUserId(user._id);
    setFormData({
      username: user.username,
      password: '',
      email: user.email,
      name: user.name,
      surname: user.surname,
      role: user.role,
      class: user.class?._id || user.class || '',
      studentId: user.studentId || '',
      subjects: user.subjects?.map(s => s.subject) || user.enrolledSubjects?.map(s => s.subject) || [],
      picture: null,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
      address: user.address || '',
      phoneNumber: user.phoneNumber || '',
      sex: user.sex || '',
      age: user.age || calculateAge(user.dateOfBirth) || '',
      active: user.active !== false,
      adminPermissions: user.adminPermissions || []
    });
    setTab('single');
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://waec-gfv0.onrender.com/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('User deleted successfully.');
      fetchUsers();
      setError(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to delete user.');
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

  const handleAdminPermissionChange = (permission) => {
    setFormData(prev => ({
      ...prev,
      adminPermissions: prev.adminPermissions.includes(permission)
        ? prev.adminPermissions.filter(p => p !== permission)
        : [...prev.adminPermissions, permission],
    }));
  };

  const handleDownloadTemplate = () => {
    const template = 'username,password,email,name,surname,role,class,studentId,subjects,picture,dateOfBirth,address,phoneNumber,sex,age,active,adminPermissions\n' +
                   'student1,password123,student1@school.com,John,Doe,student,SS1 Silver,STU001,Math;English,student1.jpg,2005-01-15,123 Main St,+1234567890,male,16,true,\n' +
                   'teacher1,password123,teacher1@school.com,Jane,Smith,teacher,SS1 Silver,,Math;Physics,teacher1.jpg,1980-05-20,456 Oak Ave,+1234567891,female,42,true,\n' +
                   'admin1,password123,admin1@school.com,Admin,User,admin,,,,admin1.jpg,1975-03-10,789 Pine Rd,+1234567892,male,48,true,MANAGE_USERS;VIEW_ANALYTICS';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'user_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const canManageUsers = () => {
    return currentUser && (
      currentUser.role === 'super_admin' || 
      (currentUser.role === 'admin' && currentUser.adminPermissions?.includes('MANAGE_USERS'))
    );
  };

  const canCreateAdmin = () => {
    return currentUser && currentUser.role === 'super_admin';
  };

  const canDeleteUser = (user) => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return user.role !== 'super_admin';
    if (currentUser.role === 'admin' && currentUser.adminPermissions?.includes('MANAGE_USERS')) {
      return user.role !== 'super_admin' && user.role !== 'admin';
    }
    return false;
  };

  const canEditUser = (user) => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    if (currentUser.role === 'admin' && currentUser.adminPermissions?.includes('MANAGE_USERS')) {
      return user.role !== 'super_admin';
    }
    return false;
  };

  // Function to get profile picture URL
  const getProfilePictureUrl = (picture) => {
    if (!picture) return null;
    if (picture.startsWith('http')) return picture;
    return `https://waec-gfv0.onrender.com/uploads/${picture}`;
  };

  if (loading && users.length === 0 && tab === 'view') {
    return <p style={{ padding: '20px', color: '#FFFFFF', backgroundColor: '#4B5320', textAlign: 'center', fontFamily: 'sans-serif', fontSize: '16px' }}>Loading users...</p>;
  }

  if (!canManageUsers()) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3 style={{ color: '#B22222' }}>Access Denied</h3>
        <p>You don't have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div>
      {error && <p style={{ backgroundColor: '#FFF3F3', color: '#B22222', borderLeft: '4px solid #B22222', padding: '15px', marginBottom: '20px', fontFamily: 'sans-serif', borderRadius: '4px', fontSize: '14px' }}>Error: {error}</p>}
      {success && <p style={{ backgroundColor: '#E6FFE6', color: '#228B22', borderLeft: '4px solid #228B22', padding: '15px', marginBottom: '20px', fontFamily: 'sans-serif', borderRadius: '4px', fontSize: '14px' }}>Success: {success}</p>}

      <div style={{ marginBottom: '20px', borderBottom: '2px solid #E0E0E0', paddingBottom: '10px' }}>
        {['view', 'single', 'bulk'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              marginRight: '10px',
              padding: '8px 16px',
              backgroundColor: tab === t ? '#D4A017' : '#4B5320',
              color: tab === t ? '#000000' : '#FFFFFF',
              border: '1px solid #000000',
              borderRadius: '6px',
              fontFamily: 'sans-serif',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {t === 'single' ? 'Create User' : t === 'bulk' ? 'Bulk Upload' : 'View Users'}
          </button>
        ))}
      </div>

      {tab === 'single' && (
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #E0E0E0' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'sans-serif', backgroundColor: '#4B5320', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
            {editUserId ? 'Edit User' : 'Create User'}
          </h3>
          <form onSubmit={handleSingleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '600px' }}>
            {/* Form fields remain the same as before */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Username *</label>
                <input
                  type="text"
                  placeholder="e.g., johndoe"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Email *</label>
                <input
                  type="email"
                  placeholder="e.g., john@school.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Password {!editUserId && '*'}</label>
              <input
                type="password"
                placeholder={editUserId ? "Leave blank to keep current" : "Min 6 characters"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editUserId}
                style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Name *</label>
                <input
                  type="text"
                  placeholder="e.g., John"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Surname *</label>
                <input
                  type="text"
                  placeholder="e.g., Doe"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  required
                  style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value, adminPermissions: e.target.value === 'admin' ? formData.adminPermissions : [] })}
                  required
                  style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                  {canCreateAdmin() && <option value="super_admin">Super Admin</option>}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Status</label>
                <select
                  value={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                  style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
                >
                  <option value={true}>Active</option>
                  <option value={false}>Inactive</option>
                </select>
              </div>
            </div>

            {formData.role === 'student' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Class *</label>
                  <select
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    required={formData.role === 'student'}
                    style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls._id} value={cls._id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Student ID</label>
                  <input
                    type="text"
                    placeholder="e.g., STU001"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
                  />
                </div>
              </div>
            )}

            {(formData.role === 'teacher' || formData.role === 'student') && formData.class && (
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Subjects</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                  {classes.find(cls => cls._id === formData.class)?.subjects?.map(subject => (
                    <label key={subject} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                      <input
                        type="checkbox"
                        checked={formData.subjects.includes(subject)}
                        onChange={() => handleSubjectChange(subject)}
                        style={{ marginRight: '5px' }}
                      />
                      <span style={{ color: '#000000', fontFamily: 'sans-serif', fontSize: '14px' }}>{subject}</span>
                    </label>
                  )) || <p style={{ color: '#666', fontFamily: 'sans-serif', fontSize: '14px' }}>Select a class to view subjects</p>}
                </div>
              </div>
            )}

            {formData.role === 'admin' && (
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Admin Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                  {adminPermissionOptions.map(perm => (
                    <label key={perm.value} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                      <input
                        type="checkbox"
                        checked={formData.adminPermissions.includes(perm.value)}
                        onChange={() => handleAdminPermissionChange(perm.value)}
                        style={{ marginRight: '5px' }}
                      />
                      <span style={{ color: '#000000', fontFamily: 'sans-serif', fontSize: '14px' }}>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Profile Picture</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={handlePictureChange}
                  required={!editUserId}
                  style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleDateOfBirthChange(e.target.value)}
                  style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Address</label>
              <input
                type="text"
                placeholder="e.g., 123 Main St"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g., +2341234567890"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Sex</label>
                <select
                  value={formData.sex}
                  onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                  style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
                >
                  <option value="">Select Sex</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>Age</label>
                <input
                  type="number"
                  placeholder="Auto-calculated"
                  value={formData.age}
                  readOnly
                  style={{ padding: '8px', border: '1px solid #CCCCCC', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F0F0F0', color: '#666666' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 20px',
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
                {editUserId ? 'Update User' : 'Create User'}
              </button>
              {editUserId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditUserId(null);
                    setFormData({
                      username: '',
                      password: '',
                      email: '',
                      name: '',
                      surname: '',
                      role: 'student',
                      class: '',
                      studentId: '',
                      subjects: [],
                      picture: null,
                      dateOfBirth: '',
                      address: '',
                      phoneNumber: '',
                      sex: '',
                      age: '',
                      active: true,
                      adminPermissions: []
                    });
                  }}
                  style={{
                    padding: '10px 20px',
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
        </div>
      )}

      {tab === 'bulk' && (
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #E0E0E0' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'sans-serif', backgroundColor: '#4B5320', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
            Bulk User Creation
          </h3>
          <p style={{ color: '#000000', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '15px' }}>
            Upload a CSV file with columns: username, password, email, name, surname, role, class, studentId, subjects (semicolon-separated), picture, dateOfBirth, address, phoneNumber, sex, age, active, adminPermissions (semicolon-separated).
          </p>
          <button
            onClick={handleDownloadTemplate}
            style={{
              padding: '8px 16px',
              backgroundColor: '#D4A017',
              color: '#000000',
              border: '1px solid #000000',
              borderRadius: '6px',
              fontFamily: 'sans-serif',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '15px',
            }}
          >
            Download CSV Template
          </button>
          <form onSubmit={handleBulkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px' }}>
            <div>
              <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>CSV File *</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                required
                style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
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
              Upload and Create Users
            </button>
          </form>
        </div>
      )}

      {tab === 'view' && (
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #E0E0E0' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'sans-serif', backgroundColor: '#4B5320', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
            Manage Users ({users.length} users)
          </h3>
          
          {loading && (
            <p style={{ textAlign: 'center', padding: '20px', color: '#4B5320' }}>Loading users...</p>
          )}

          {!loading && users.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No users found.</p>
              <button 
                onClick={fetchUsers}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  backgroundColor: '#4B5320',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry Loading Users
              </button>
            </div>
          )}

          {!loading && users.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E0E0E0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#4B5320', color: '#FFFFFF', fontFamily: 'sans-serif', fontSize: '12px' }}>
                    <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Profile</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Username</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Email</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Name</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Role</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Class</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Age</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Status</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Admin Permissions</th>
                    <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id} style={{ 
                      color: '#000000', 
                      fontFamily: 'sans-serif', 
                      fontSize: '12px',
                      backgroundColor: user.active ? 'transparent' : '#FFF3F3'
                    }}>
                      <td style={{ border: '1px solid #E0E0E0', padding: '8px', textAlign: 'center' }}>
                        {user.picture ? (
                          <img 
                            src={getProfilePictureUrl(user.picture)} 
                            alt="Profile" 
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              objectFit: 'cover', 
                              borderRadius: '50%',
                              border: '2px solid #D4A017'
                            }} 
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div 
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: '#4B5320',
                              color: '#FFFFFF',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            {user.name?.charAt(0)}{user.surname?.charAt(0)}
                          </div>
                        )}
                      </td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{user.username}</td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{user.email}</td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{user.name} {user.surname}</td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: 
                            user.role === 'super_admin' ? '#FF6B6B' :
                            user.role === 'admin' ? '#4ECDC4' :
                            user.role === 'teacher' ? '#45B7D1' : '#96CEB4',
                          color: '#000000'
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>{user.class?.name || 'N/A'}</td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                        {user.age || calculateAge(user.dateOfBirth) || 'N/A'}
                      </td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: user.active ? '#E6FFE6' : '#FFF3F3',
                          color: user.active ? '#228B22' : '#B22222'
                        }}>
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                        {user.adminPermissions?.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                            {user.adminPermissions.map(perm => (
                              <span key={perm} style={{
                                padding: '1px 4px',
                                backgroundColor: '#D4A017',
                                color: '#000000',
                                borderRadius: '2px',
                                fontSize: '10px',
                                margin: '1px'
                              }}>
                                {perm}
                              </span>
                            ))}
                          </div>
                        ) : 'N/A'}
                      </td>
                      <td style={{ border: '1px solid #E0E0E0', padding: '8px', display: 'flex', gap: '5px' }}>
                        {canEditUser(user) && (
                          <button
                            onClick={() => handleEditUser(user)}
                            style={{ 
                              color: '#000000', 
                              backgroundColor: '#D4A017', 
                              fontFamily: 'sans-serif', 
                              fontSize: '12px', 
                              padding: '5px 10px', 
                              border: '1px solid #000000', 
                              borderRadius: '4px', 
                              cursor: 'pointer' 
                            }}
                          >
                            Edit
                          </button>
                        )}
                        {canDeleteUser(user) && (
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            style={{ 
                              color: '#FFFFFF', 
                              backgroundColor: '#B22222', 
                              fontFamily: 'sans-serif', 
                              fontSize: '12px', 
                              padding: '5px 10px', 
                              border: '1px solid #000000', 
                              borderRadius: '4px', 
                              cursor: 'pointer' 
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageUsers;