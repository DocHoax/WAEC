import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FiAlertTriangle, FiCheckCircle, FiArrowLeft, FiTrash2, FiSearch } from 'react-icons/fi';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://waec-gfv0.onrender.com' : 'http://localhost:5000';

const SetBatch = () => {
  const { testId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [test, setTest] = useState(null);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [newBatch, setNewBatch] = useState({ name: '', start: '', end: '', students: [] });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useLocation().state?.success || null;
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');

  const fetchTest = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTest(res.data);
      setBatches(res.data.batches || []);
      await fetchStudents(res.data.subject, res.data.class);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load test.');
      console.error('Fetch test error:', err.response?.data, err.response?.status);
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchTest();
    }
  }, [user, fetchTest]);

  const fetchStudents = async (subject, className) => {
    try {
      console.log('Fetching students for:', { testId, subject, className });
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/auth/students/${subject}/${className}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(res.data);
      setFilteredStudents(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'No students available for this subject and class.');
      console.error('Fetch students error:', err.response?.data, err.response?.status);
      setStudents([]);
      setFilteredStudents([]);
    }
    setLoading(false);
  };

  const handleAddBatch = async () => {
    if (!newBatch.name || !newBatch.start || !newBatch.end || !newBatch.students.length) {
      setError('Please provide batch name, start/end dates, and select at least one student.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/api/tests/${testId}/schedule`,
        { batches: [...batches, { name: newBatch.name, schedule: { start: newBatch.start, end: newBatch.end }, students: newBatch.students }] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Batch added successfully.');
      setError(null);
      setNewBatch({ name: '', start: '', end: '', students: [] });
      fetchTest();
      navigate(`/admin/tests/${testId}/batch`, { state: { success: 'Batch added successfully.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add batch.');
      console.error('Add batch error:', err.response?.data, err.response?.status);
    }
  };

  const handleDeleteBatch = async (batchIndex) => {
    try {
      const token = localStorage.getItem('token');
      const updatedBatches = batches.filter((_, i) => i !== batchIndex);
      await axios.put(
        `${API_BASE_URL}/api/tests/${testId}/schedule`,
        { batches: updatedBatches },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Batch deleted successfully.');
      setError(null);
      fetchTest();
      navigate(`/admin/tests/${testId}/batch`, { state: { success: 'Batch deleted successfully.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete batch.');
      console.error('Delete batch error:', err.response?.data, err.response?.status);
    }
  };

  const handleStudentSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setStudentSearch(query);
    setFilteredStudents(
      students.filter(student =>
        (student.name?.toLowerCase() || student.username?.toLowerCase()).includes(query)
      )
    );
  };

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
          backgroundColor: 'rgba(255, 243, 243, 0.9)',
          color: '#B22222',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'fadeIn 0.6s ease-out'
        }}>
          <FiAlertTriangle style={{ fontSize: '24px' }} />
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
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          color: '#4B5320',
          animation: 'fadeIn 0.6s ease-out'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#b8c2cc',
      fontFamily: '"Fredoka", sans-serif',
      animation: 'slideIn 0.5s ease-out'
    }}>
      <header style={{
        backgroundColor: '#4B5320',
        color: '#FFFFFF',
        padding: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
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
              src="/uploads/sanni.png"
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
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: '"Fredoka", sans-serif' }}>Sanniville Academy</h1>
              <p style={{ fontSize: '14px', color: '#D4A017', fontFamily: '"Fredoka", sans-serif' }}>Set Test Batches</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/tests')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#D4A017',
              color: '#4B5320',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: '"Fredoka", sans-serif',
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
            <FiArrowLeft /> Back to Manage Tests
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
            backgroundColor: 'rgba(255, 243, 243, 0.9)',
            color: '#B22222',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'shake 0.5s ease-in-out'
          }}>
            <FiAlertTriangle style={{ fontSize: '20px' }} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div style={{
            backgroundColor: 'rgba(230, 255, 230, 0.9)',
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
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
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
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#4B5320',
            marginBottom: '24px',
            fontFamily: '"Fredoka", sans-serif'
          }}>
            Set Batches for {test?.title} ({test?.subject}, {test?.class})
          </h2>
        </div>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          marginBottom: '24px',
          animation: 'slideUp 0.5s ease-out 0.1s both',
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
            fontSize: '18px',
            fontWeight: '600',
            color: '#4B5320',
            marginBottom: '16px',
            fontFamily: '"Fredoka", sans-serif'
          }}>
            Add New Batch
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="text"
              placeholder="Batch Name (e.g., Set A)"
              value={newBatch.name}
              onChange={e => setNewBatch({ ...newBatch, name: e.target.value })}
              style={{
                padding: '12px',
                border: '1px solid #D3D3D3',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                width: '100%',
                fontFamily: '"Fredoka", sans-serif',
                transition: 'border-color 0.3s ease'
              }}
            />
            <input
              type="datetime-local"
              value={newBatch.start}
              onChange={e => setNewBatch({ ...newBatch, start: e.target.value })}
              style={{
                padding: '12px',
                border: '1px solid #D3D3D3',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                width: '100%',
                fontFamily: '"Fredoka", sans-serif',
                transition: 'border-color 0.3s ease'
              }}
            />
            <input
              type="datetime-local"
              value={newBatch.end}
              onChange={e => setNewBatch({ ...newBatch, end: e.target.value })}
              style={{
                padding: '12px',
                border: '1px solid #D3D3D3',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                width: '100%',
                fontFamily: '"Fredoka", sans-serif',
                transition: 'border-color 0.3s ease'
              }}
            />
            <div style={{
              border: '1px solid #D3D3D3',
              borderRadius: '6px',
              padding: '16px',
              maxHeight: '200px',
              overflowY: 'auto',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={handleStudentSearch}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    border: '1px solid #D3D3D3',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    fontFamily: '"Fredoka", sans-serif'
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
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student, index) => (
                  <label key={student._id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 0',
                    fontSize: '14px',
                    color: '#4B5320',
                    fontFamily: '"Fredoka", sans-serif',
                    animation: `fadeIn 0.5s ease-out ${index * 0.05}s both`,
                    transition: 'background-color 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}>
                    <input
                      type="checkbox"
                      value={student._id}
                      checked={newBatch.students.includes(student._id)}
                      onChange={e => {
                        const updatedStudents = e.target.checked
                          ? [...newBatch.students, student._id]
                          : newBatch.students.filter(id => id !== student._id);
                        setNewBatch({ ...newBatch, students: updatedStudents });
                      }}
                      style={{ margin: 0 }}
                    />
                    {student.name || student.username} ({student._id})
                  </label>
                ))
              ) : (
                <p style={{ color: '#6B7280', fontSize: '14px', textAlign: 'center', fontFamily: '"Fredoka", sans-serif' }}>
                  No students available
                </p>
              )}
            </div>
            <button
              onClick={handleAddBatch}
              style={{
                padding: '12px 24px',
                backgroundColor: '#D4A017',
                color: '#4B5320',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: '"Fredoka", sans-serif',
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
              Add Batch
            </button>
          </div>
        </div>
        {batches.length > 0 && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            animation: 'slideUp 0.5s ease-out 0.2s both'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#4B5320',
              marginBottom: '16px',
              fontFamily: '"Fredoka", sans-serif'
            }}>
              Existing Batches
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {batches.map((batch, index) => (
                <div key={index} style={{
                  padding: '20px',
                  border: '1px solid #D3D3D3',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: '500', color: '#4B5320', fontFamily: '"Fredoka", sans-serif' }}>{batch.name}</p>
                    <p style={{ fontSize: '14px', color: '#6B7280', fontFamily: '"Fredoka", sans-serif' }}>
                      Schedule: {new Date(batch.schedule.start).toLocaleString()} - {new Date(batch.schedule.end).toLocaleString()}
                    </p>
                    <p style={{ fontSize: '14px', color: '#6B7280', fontFamily: '"Fredoka", sans-serif' }}>Students: {batch.students.length}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteBatch(index)}
                    style={{
                      color: '#B22222',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '4px',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#ffe6e6';
                      e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    <FiTrash2 style={{ fontSize: '20px' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
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

export default SetBatch;