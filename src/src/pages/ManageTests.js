import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FiAlertTriangle, FiCheckCircle, FiEye, FiCalendar, FiBarChart, FiSearch, FiTrash2 } from 'react-icons/fi';

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

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchTests();
    }
  }, [user]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://waec-gfv0.onrender.com/api/tests/admin', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTests(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tests.');
      console.error('Fetch tests error:', err.response?.data, err.response?.status);
    }
    setLoading(false);
  };

  const handleApproveTest = async (testId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `https://waec-gfv0.onrender.com/api/tests/${testId}/schedule`,
        { status: 'scheduled' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Test approved successfully.');
      setError(null);
      fetchTests();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve test.');
      console.error('Approve test error:', err.response?.data, err.response?.status);
    }
  };

  const handleDelete = async (testId, testTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${testTitle}"? This will also delete all related results.`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://waec-gfv0.onrender.com/api/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTests(tests.filter(test => test._id !== testId));
      setSuccess('Test deleted successfully.');
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete test.');
      console.error('Delete test error:', err.response?.data, err.response?.status);
    }
  };

  const filteredTests = tests.filter(test => 
    (test.title.toLowerCase().includes(search.toLowerCase()) || 
     test.subject.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus === 'all' || test.status === filterStatus) &&
    (filterClass === 'all' || test.class === filterClass)
  );

  const uniqueClasses = [...new Set(tests.map(test => test.class))];

  if (!user || user.role !== 'admin') {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#b8c2cc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Fredoka", sans-serif'
      }}>
        <div style={{
          backgroundColor: '#FFF3F3',
          color: '#B22222',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: '"Fredoka", sans-serif',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          <FiAlertTriangle style={{ fontSize: '20px' }} />
          <p>Access restricted to admins.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#b8c2cc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Fredoka", sans-serif'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          color: '#4B5320',
          fontFamily: '"Fredoka", sans-serif',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          Loading tests...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#b8c2cc',
      fontFamily: '"Fredoka", sans-serif',
      padding: '20px'
    }}>
      <main style={{
        maxWidth: '1280px',
        margin: '0 auto'
      }}>
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
            gap: '8px',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <FiAlertTriangle style={{ fontSize: '20px' }} />
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
            gap: '8px',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <FiCheckCircle style={{ fontSize: '20px' }} />
            <span>{success}</span>
          </div>
        )}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Search by title or subject..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                border: '1px solid #D3D3D3',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                fontFamily: '"Fredoka", sans-serif'
              }}
            />
            <FiSearch style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6B7280',
              fontSize: '18px'
            }} />
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #D3D3D3',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                minWidth: '150px',
                fontFamily: '"Fredoka", sans-serif'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
            </select>
            <select
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #D3D3D3',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                minWidth: '150px',
                fontFamily: '"Fredoka", sans-serif'
              }}
            >
              <option value="all">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredTests.length === 0 ? (
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            textAlign: 'center',
            color: '#6B7280',
            fontSize: '16px',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            No tests available.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '24px'
          }}>
            {filteredTests.map((test, index) => (
              <div 
                key={test._id} 
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#4B5320',
                  marginBottom: '12px',
                  fontFamily: '"Fredoka", sans-serif'
                }}>
                  {test.title} ({test.subject}, {test.class})
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  marginBottom: '8px',
                  fontFamily: '"Fredoka", sans-serif'
                }}>
                  Status: <span style={{ 
                    color: test.status === 'scheduled' ? '#228B22' : '#D4A017',
                    fontWeight: '600'
                  }}>{test.status}</span>
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  marginBottom: '8px',
                  fontFamily: '"Fredoka", sans-serif'
                }}>
                  Created by: {test.createdBy?.username || 'Unknown'}
                </p>
                {test.batches?.length > 0 && (
                  <p style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    marginBottom: '16px',
                    fontFamily: '"Fredoka", sans-serif'
                  }}>
                    Batches: {test.batches.map(b => `${b.name} (${new Date(b.schedule.start).toLocaleString()} - ${new Date(b.schedule.end).toLocaleString()})`).join(', ')}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => navigate(`/admin/tests/${test._id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      backgroundColor: '#6B7280',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontFamily: '"Fredoka", sans-serif',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.target.style.transform = 'translateY(0)'}
                  >
                    <FiEye /> View Test
                  </button>
                  <button
                    onClick={() => navigate(`/admin/results/${test._id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      backgroundColor: '#D4A017',
                      color: '#4B5320',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontFamily: '"Fredoka", sans-serif',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.target.style.transform = 'translateY(0)'}
                  >
                    <FiBarChart /> View Results
                  </button>
                  {test.status === 'draft' && (
                    <button
                      onClick={() => handleApproveTest(test._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: '#28a745',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontFamily: '"Fredoka", sans-serif',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
                      onMouseOut={e => e.target.style.transform = 'translateY(0)'}
                    >
                      <FiCheckCircle /> Approve Test
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/admin/tests/${test._id}/batch`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      backgroundColor: '#D4A017',
                      color: '#4B5320',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontFamily: '"Fredoka", sans-serif',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.target.style.transform = 'translateY(0)'}
                  >
                    <FiCalendar /> Manage Batches
                  </button>
                  <button
                    onClick={() => handleDelete(test._id, test.title)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      backgroundColor: '#B22222',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontFamily: '"Fredoka", sans-serif',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.target.style.transform = 'translateY(0)'}
                  >
                    <FiTrash2 /> Delete Test
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
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
        `}
      </style>
    </div>
  );
};

export default ManageTests;