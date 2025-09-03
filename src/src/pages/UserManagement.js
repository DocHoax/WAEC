import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import Button from '../components/Button';

const UserManagement = () => {
  const { user, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    permissions: []
  });

  useEffect(() => {
    if (user && hasPermission('view_users')) {
      fetchUsers();
      fetchPermissions();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/api/admin/users/permissions');
      setPermissions(response.data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/users', formData);
      setShowCreateForm(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'admin',
        permissions: []
      });
      fetchUsers(); // Refresh the list
      setError('');
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handlePermissionChange = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { active: !currentStatus });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user status:', error);
      setError('Failed to update user status');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/api/admin/users/${userId}`);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user');
    }
  };

  if (!user || !hasPermission('view_users')) {
    return (
      <div style={styles.accessDenied}>
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return <div style={styles.loading}>Loading users...</div>;
  }

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {});

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>User Management</h2>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          permission="create_users"
        >
          {showCreateForm ? 'Cancel' : 'Create New User'}
        </Button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {showCreateForm && (
        <form onSubmit={handleCreateUser} style={styles.form}>
          <h3>Create New User</h3>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label>Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Email:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Password:</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Role:</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={styles.select}
              >
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>
          </div>

          {formData.role !== 'super_admin' && formData.role !== 'student' && (
            <div style={styles.permissionsSection}>
              <h4>Permissions:</h4>
              {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                <div key={category} style={styles.permissionCategory}>
                  <h5>{category}</h5>
                  <div style={styles.permissionsGrid}>
                    {categoryPermissions.map(permission => (
                      <label key={permission._id} style={styles.permissionLabel}>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(permission._id)}
                          onChange={() => handlePermissionChange(permission._id)}
                          style={styles.checkbox}
                        />
                        {permission.description}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button type="submit" permission="create_users">
            Create User
          </Button>
        </form>
      )}

      <div style={styles.usersList}>
        <h3>Users</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td style={styles.td}>{user.name}</td>
                <td style={styles.td}>{user.email}</td>
                <td style={styles.td}>{user.role}</td>
                <td style={styles.td}>
                  <span style={user.active ? styles.active : styles.inactive}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={styles.td}>
                  <Button
                    onClick={() => toggleUserStatus(user._id, user.active)}
                    permission="edit_users"
                    style={styles.smallButton}
                  >
                    {user.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    onClick={() => deleteUser(user._id)}
                    permission="delete_users"
                    style={{ ...styles.smallButton, ...styles.deleteButton }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    color: '#4B5320',
    margin: 0
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px'
  },
  error: {
    padding: '10px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  accessDenied: {
    textAlign: 'center',
    padding: '40px',
    color: '#dc3545'
  },
  form: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  input: {
    padding: '8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px'
  },
  select: {
    padding: '8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white'
  },
  permissionsSection: {
    marginBottom: '20px'
  },
  permissionCategory: {
    marginBottom: '15px'
  },
  permissionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '10px'
  },
  permissionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  checkbox: {
    margin: 0
  },
  usersList: {
    marginTop: '30px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  th: {
    backgroundColor: '#4B5320',
    color: 'white',
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #dee2e6'
  },
  active: {
    color: '#28a745',
    fontWeight: 'bold'
  },
  inactive: {
    color: '#dc3545',
    fontWeight: 'bold'
  },
  smallButton: {
    padding: '5px 10px',
    fontSize: '12px',
    marginRight: '5px'
  },
  deleteButton: {
    backgroundColor: '#dc3545'
  }
};

export default UserManagement;