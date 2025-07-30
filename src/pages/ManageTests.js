import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FiAlertTriangle, FiCheckCircle, FiEye, FiCalendar, FiBarChart, FiSearch, FiArrowLeft } from 'react-icons/fi';

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
      const res = await axios.get('http://localhost:5000/api/tests/admin', {
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
        `http://localhost:5000/api/tests/${testId}/schedule`,
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
        backgroundColor: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
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
          fontFamily: 'sans-serif'
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
        backgroundColor: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          color: '#4B5320',
          fontFamily: 'sans-serif'
        }}>
          Loading tests...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8F9FA',
      fontFamily: 'sans-serif'
    }}>
      <header style={{
        backgroundColor: '#4B5320',
        color: '#FFFFFF',
        padding: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src="/images/sanni.png"
              alt="Sanniville Academy"
              style={{
                height: '48px',
                border: '2px solid #D4A017',
                padding: '4px',
                backgroundColor: '#FFFFFF',
                borderRadius: '4px'
              }}
            />
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Sanniville Academy</h1>
              <p style={{ fontSize: '14px', color: '#D4A017' }}>Manage Tests & Exams</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#D4A017',
              color: '#4B5320',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <FiArrowLeft /> Back to Dashboard
          </button>
        </div>
      </header>

      <main style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '24px'
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
            gap: '8px'
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
            gap: '8px'
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
                padding: '8px 12px 8px 36px',
                border: '1px solid #D3D3D3',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
            />
            <FiSearch style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6B7280',
              fontSize: '16px'
            }} />
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #D3D3D3',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                minWidth: '150px'
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
                padding: '8px 12px',
                border: '1px solid #D3D3D3',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                minWidth: '150px'
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
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center',
            color: '#6B7280',
            fontSize: '16px'
          }}>
            No tests available.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {filteredTests.map(test => (
              <div key={test._id} style={{
                backgroundColor: '#FFFFFF',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'box-shadow 0.3s'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#4B5320',
                  marginBottom: '8px'
                }}>
                  {test.title} ({test.subject}, {test.class})
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  marginBottom: '4px'
                }}>
                  Status: <span style={{ color: test.status === 'scheduled' ? '#228B22' : '#D4A017' }}>{test.status}</span>
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  marginBottom: '4px'
                }}>
                  Created by: {test.createdBy?.username || 'Unknown'}
                </p>
                {test.batches?.length > 0 && (
                  <p style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    marginBottom: '16px'
                  }}>
                    Batches: {test.batches.map(b => `${b.name} (${new Date(b.schedule.start).toLocaleString()} - ${new Date(b.schedule.end).toLocaleString()})`).join(', ')}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => navigate(`/admin/tests/${test._id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      backgroundColor: '#6B7280',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <FiEye /> View Test
                  </button>
                  <button
                    onClick={() => navigate(`/admin/results/${test._id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      backgroundColor: '#D4A017',
                      color: '#4B5320',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
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
                        padding: '8px 16px',
                        backgroundColor: '#28a745',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
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
                      padding: '8px 16px',
                      backgroundColor: '#D4A017',
                      color: '#4B5320',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <FiCalendar /> Manage Batches
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageTests;