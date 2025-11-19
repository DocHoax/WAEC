import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FiAlertTriangle, FiCheckCircle, FiEye, FiCalendar, FiBarChart, FiSearch, FiTrash2, FiClock, FiUsers, FiEdit, FiCheck, FiX } from 'react-icons/fi';

const ManageTests = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [tests, setTests] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(location.state?.success || null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'teacher')) {
      fetchTests();
      fetchClasses();
    }
  }, [user]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://waec-gfv0.onrender.com/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(res.data.classes || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      // Determine which endpoint to use based on user role
      let endpoint = 'https://waec-gfv0.onrender.com/api/tests';
      
      if (user.role === 'admin' || user.role === 'super_admin') {
        endpoint = 'https://waec-gfv0.onrender.com/api/tests/admin';
      } else if (user.role === 'teacher') {
        endpoint = 'https://waec-gfv0.onrender.com/api/tests';
      }

      console.log('Fetching tests from:', endpoint);
      
      const res = await axios.get(endpoint, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      console.log('Tests fetched successfully:', res.data);
      setTests(Array.isArray(res.data) ? res.data : res.data.tests || []);
    } catch (err) {
      console.error('Fetch tests error:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to load tests. Please check your connection.';
      setError(errorMessage);
    }
    setLoading(false);
  };

  // NEW: Approve test (Admin/Super Admin only)
  const handleApproveTest = async (testId) => {
    if (!window.confirm('Are you sure you want to approve this test? This will allow it to be scheduled.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `https://waec-gfv0.onrender.com/api/tests/${testId}/approve`,
        {},
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      setSuccess('Test approved successfully. You can now schedule it.');
      setError(null);
      fetchTests(); // Refresh the list
    } catch (err) {
      console.error('Approve test error:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to approve test.';
      setError(errorMessage);
    }
  };

  // NEW: Schedule test (Admin/Super Admin only)
  const handleScheduleTest = async (testId) => {
    // Navigate to schedule page
    navigate(`/admin/tests/${testId}/schedule`);
  };

  // NEW: Publish test (Teacher only - for their own tests)
  const handlePublishTest = async (testId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `https://waec-gfv0.onrender.com/api/tests/${testId}`,
        { status: 'published' },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      setSuccess('Test published for admin review.');
      setError(null);
      fetchTests();
    } catch (err) {
      console.error('Publish test error:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to publish test.';
      setError(errorMessage);
    }
  };

  const handleDelete = async (testId, testTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${testTitle}"? This will also delete all related results and cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://waec-gfv0.onrender.com/api/tests/${testId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      setTests(tests.filter(test => test._id !== testId));
      setSuccess('Test deleted successfully.');
      setError(null);
    } catch (err) {
      console.error('Delete test error:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to delete test.';
      setError(errorMessage);
    }
  };

  // Filter tests based on search and filters
  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title?.toLowerCase().includes(search.toLowerCase()) || 
                         test.subject?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || test.status === filterStatus;
    const matchesClass = filterClass === 'all' || test.class === filterClass;
    
    return matchesSearch && matchesStatus && matchesClass;
  });

  // Get unique classes for filter dropdown
  const uniqueClasses = [...new Set(tests.map(test => test.class?.name || test.class).filter(Boolean))];

  // Check if user has permission to manage tests
  const canManageTests = () => {
    if (!user) return false;
    return user.role === 'super_admin' || user.role === 'admin' || user.role === 'teacher';
  };

  // Check if user can approve tests
  const canApproveTests = () => {
    if (!user) return false;
    return user.role === 'super_admin' || 
          (user.role === 'admin' && user.adminPermissions?.includes('APPROVE_TESTS'));
  };

  // Check if user can schedule tests
  const canScheduleTests = () => {
    if (!user) return false;
    return user.role === 'super_admin' || 
          (user.role === 'admin' && user.adminPermissions?.includes('MANAGE_TESTS'));
  };

  // Check if user can delete tests
  const canDeleteTest = (test) => {
    if (!user) return false;
    
    if (user.role === 'super_admin') return true;
    if (user.role === 'admin' && user.adminPermissions?.includes('MANAGE_TESTS')) return true;
    
    // Teachers can only delete their own draft tests
    if (user.role === 'teacher' && test.createdBy?._id === user._id && test.status === 'draft') {
      return true;
    }
    
    return false;
  };

  // Check if user can edit test
  const canEditTest = (test) => {
    if (!user) return false;
    
    if (user.role === 'super_admin') return true;
    if (user.role === 'admin' && user.adminPermissions?.includes('MANAGE_TESTS')) return true;
    
    // Teachers can only edit their own draft tests
    if (user.role === 'teacher' && test.createdBy?._id === user._id && test.status === 'draft') {
      return true;
    }
    
    return false;
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return { bg: '#FFF3CD', color: '#D4A017', label: 'Draft' };
      case 'approved': return { bg: '#E6FFE6', color: '#228B22', label: 'Approved' };
      case 'scheduled': return { bg: '#D1ECF1', color: '#0C5460', label: 'Scheduled' };
      case 'active': return { bg: '#D4EDDA', color: '#155724', label: 'Active' };
      case 'completed': return { bg: '#E2E3E5', color: '#383D41', label: 'Completed' };
      default: return { bg: '#F8F9FA', color: '#6C757D', label: status };
    }
  };

  if (!user || !canManageTests()) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: '#FFF3F3',
          color: '#B22222',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: 'sans-serif',
          maxWidth: '400px'
        }}>
          <FiAlertTriangle style={{ fontSize: '24px', flexShrink: 0 }} />
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Access Denied</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>You don't have permission to manage tests.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          color: '#4B5320',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '16px', marginBottom: '16px' }}>Loading tests...</div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #4B5320',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8F9FA',
      fontFamily: 'sans-serif'
    }}>
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#4B5320',
              margin: '0 0 8px 0'
            }}>
              Manage Tests
            </h1>
            <p style={{
              color: '#6B7280',
              margin: 0,
              fontSize: '16px'
            }}>
              {user.role === 'teacher' 
                ? 'Create and manage your tests' 
                : 'Approve, schedule, and monitor tests'}
            </p>
          </div>
          
          {/* Only show Create Test button for teachers */}
          {user.role === 'teacher' && (
            <button
              onClick={() => navigate('/admin/create-test')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#D4A017',
                color: '#4B5320',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <FiCalendar /> Create New Test
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            backgroundColor: '#FFF3F3',
            color: '#B22222',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FiAlertTriangle style={{ fontSize: '20px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div style={{
            backgroundColor: '#E6FFE6',
            color: '#228B22',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FiCheckCircle style={{ fontSize: '20px', flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ position: 'relative', minWidth: '300px' }}>
            <input
              type="text"
              placeholder="Search by title or subject..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 40px',
                border: '1px solid #D3D3D3',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                transition: 'border-color 0.2s'
              }}
            />
            <FiSearch style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6B7280',
              fontSize: '16px'
            }} />
          </div>
          
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1px solid #D3D3D3',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              minWidth: '150px',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1px solid #D3D3D3',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              minWidth: '150px',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Classes</option>
            {uniqueClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>

          <button
            onClick={fetchTests}
            style={{
              padding: '12px 16px',
              backgroundColor: '#6B7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FiClock /> Refresh
          </button>
        </div>

        {/* Tests Grid */}
        {filteredTests.length === 0 ? (
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '48px 24px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            <FiUsers style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>No Tests Found</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              {tests.length === 0 ? 'No tests have been created yet.' : 'No tests match your search criteria.'}
            </p>
            {user.role === 'teacher' && (
              <button
                onClick={() => navigate('/admin/create-test')}
                style={{
                  marginTop: '16px',
                  padding: '10px 20px',
                  backgroundColor: '#D4A017',
                  color: '#4B5320',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Create Your First Test
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '24px'
          }}>
            {filteredTests.map(test => {
              const statusInfo = getStatusColor(test.status);
              const isTestOwner = user.role === 'teacher' && test.createdBy?._id === user._id;
              
              return (
                <div key={test._id} style={{
                  backgroundColor: '#FFFFFF',
                  padding: '24px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: `1px solid ${statusInfo.color}`,
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}>
                  {/* Test Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#4B5320',
                        margin: '0 0 8px 0',
                        lineHeight: '1.4'
                      }}>
                        {test.title}
                      </h3>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: statusInfo.bg,
                          color: statusInfo.color,
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {statusInfo.label}
                        </span>
                        <span style={{
                          color: '#6B7280',
                          fontSize: '14px'
                        }}>
                          {test.subject} • {test.class?.name || test.class}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Test Details */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#6B7280',
                      fontSize: '14px'
                    }}>
                      <FiUsers />
                      <span>Created by: {test.createdBy?.username || test.createdBy?.name || 'Unknown'}</span>
                    </div>
                    
                    {test.duration && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#6B7280',
                        fontSize: '14px'
                      }}>
                        <FiClock />
                        <span>Duration: {test.duration} minutes</span>
                      </div>
                    )}
                    
                    {test.totalMarks && (
                      <div style={{
                        color: '#6B7280',
                        fontSize: '14px'
                      }}>
                        Total Marks: {test.totalMarks}
                      </div>
                    )}
                    
                    {test.questionCount && (
                      <div style={{
                        color: '#6B7280',
                        fontSize: '14px'
                      }}>
                        Questions: {test.questions?.length || 0} / {test.questionCount}
                      </div>
                    )}

                    {test.session && (
                      <div style={{
                        color: '#6B7280',
                        fontSize: '14px'
                      }}>
                        Session: {test.session}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px'
                  }}>
                    {/* View Details - Available to all */}
                    <button
                      onClick={() => navigate(`/admin/tests/${test._id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: '#6B7280',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        width: '100%'
                      }}
                    >
                      <FiEye /> View Details
                    </button>

                    {/* View Results - Available to all except students */}
                    <button
                      onClick={() => navigate(`/admin/results/${test._id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: '#D4A017',
                        color: '#4B5320',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        width: '100%'
                      }}
                    >
                      <FiBarChart /> View Results
                    </button>

                    {/* ADMIN/SUPER ADMIN ACTIONS */}
                    {(user.role === 'admin' || user.role === 'super_admin') && (
                      <>
                        {/* Approve Test - Only for draft tests */}
                        {test.status === 'draft' && canApproveTests() && (
                          <button
                            onClick={() => handleApproveTest(test._id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              padding: '10px 16px',
                              backgroundColor: '#28a745',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              width: '100%'
                            }}
                          >
                            <FiCheck /> Approve Test
                          </button>
                        )}

                        {/* Schedule Test - Only for approved tests */}
                        {test.status === 'approved' && canScheduleTests() && (
                          <button
                            onClick={() => handleScheduleTest(test._id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              padding: '10px 16px',
                              backgroundColor: '#007bff',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              width: '100%'
                            }}
                          >
                            <FiCalendar /> Schedule Test
                          </button>
                        )}

                        {/* Edit Test - Admins can edit any test */}
                        {canEditTest(test) && (
                          <button
                            onClick={() => navigate(`/admin/tests/${test._id}/edit`)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              padding: '10px 16px',
                              backgroundColor: '#17a2b8',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              width: '100%'
                            }}
                          >
                            <FiEdit /> Edit Test
                          </button>
                        )}

                        {/* Delete Test - Admins can delete any test */}
                        {canDeleteTest(test) && (
                          <button
                            onClick={() => handleDelete(test._id, test.title)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              padding: '10px 16px',
                              backgroundColor: '#dc3545',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              width: '100%'
                            }}
                          >
                            <FiTrash2 /> Delete Test
                          </button>
                        )}
                      </>
                    )}

                    {/* TEACHER ACTIONS */}
                    {user.role === 'teacher' && isTestOwner && (
                      <>
                        {/* Edit Test - Teachers can only edit their own draft tests */}
                        {test.status === 'draft' && (
                          <button
                            onClick={() => navigate(`/admin/tests/${test._id}/edit`)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              padding: '10px 16px',
                              backgroundColor: '#17a2b8',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              width: '100%'
                            }}
                          >
                            <FiEdit /> Edit Test
                          </button>
                        )}

                        {/* Delete Test - Teachers can only delete their own draft tests */}
                        {test.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(test._id, test.title)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              padding: '10px 16px',
                              backgroundColor: '#dc3545',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              width: '100%'
                            }}
                          >
                            <FiTrash2 /> Delete Test
                          </button>
                        )}

                        {/* Submit for Approval - Teachers can submit draft tests for admin review */}
                        {test.status === 'draft' && (
                          <button
                            onClick={() => handlePublishTest(test._id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              padding: '10px 16px',
                              backgroundColor: '#28a745',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              width: '100%'
                            }}
                          >
                            <FiCheckCircle /> Submit for Approval
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageTests;