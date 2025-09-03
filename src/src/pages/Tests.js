import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify'; // Add this
import 'react-toastify/dist/ReactToastify.css'; // Add this
import { ToastContainer } from 'react-toastify';


const Tests = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');

  useEffect(() => {
    const fetchTests = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        toast.error('Please login again.', { position: 'top-right', autoClose: 5000 });
        setLoading(false);
        navigate('/login');
        return;
      }
      try {
        const res = await fetch('https://waec-gfv0.onrender.com/api/tests', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load tests');
        console.log('Tests - Fetched tests:', data);
        setTests(data.filter(t => t.status === 'scheduled'));
        setLoading(false);
      } catch (err) {
        console.error('Tests - Error:', err.message);
        setError(err.message);
        toast.error(err.message, { position: 'top-right', autoClose: 5000 });
        setLoading(false);
      }
    };
    if (user && user.role === 'student') {
      fetchTests();
    }
  }, [user, navigate]);

  const getStudentBatch = (test) => {
    const batch = test.batches?.find(b => b.students.includes(user.userId || user._id));
    return batch ? { name: batch.name, start: new Date(batch.schedule.start), end: new Date(batch.schedule.end) } : null;
  };

  const isTestAvailable = (test) => {
    const batch = getStudentBatch(test);
    if (!batch) return false;
    const now = new Date();
    return now >= batch.start && now <= batch.end;
  };

  const filteredTests = tests.filter(
    test =>
      (!filterSubject || test.subject === filterSubject) &&
      (!filterClass || test.class === filterClass) &&
      getStudentBatch(test)
  );

  const subjectOptions = [...new Set(tests.map(test => test.subject).filter(Boolean))];
  const classOptions = [...new Set(tests.map(test => test.class).filter(Boolean))];

  const handleTakeTest = async (testId, testTitle) => {
    console.log('Tests - Navigating to test:', { testId, userId: user.userId || user._id });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://waec-gfv0.onrender.com/api/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log('Tests - Test fetch response:', { status: res.status, data });
      if (!res.ok) {
        throw new Error(data.error || `Failed to access test (Status: ${res.status})`);
      }
      if (data.questions.length === 0) {
        throw new Error(`Test "${testTitle}" has no valid questions.`);
      }
      navigate(`/student/test/${testId}`);
    } catch (err) {
      console.error('Tests - Error checking test:', err.message);
      setError(err.message);
      toast.error(err.message || 'Failed to start test', { position: 'top-right', autoClose: 5000 });
    }
  };

  const resetFilters = () => {
    setFilterSubject('');
    setFilterClass('');
  };

  if (!user || user.role !== 'student') {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#FFF3F3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <p style={{
          color: '#B22222',
          fontSize: '18px',
          fontWeight: '600'
        }}>Access restricted to students.</p>
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
        justifyContent: 'center',
        textAlign: 'center',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <p style={{
          color: '#4B5320',
          fontSize: '18px',
          fontWeight: '600',
          animation: 'pulse 1.5s infinite'
        }}>Loading tests...</p>
        <style>{`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8F9FA',
      padding: '30px',
      fontFamily: "'Roboto', sans-serif"
    }}>
      <ToastContainer /> {/* Add this */}
      {error && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#FFF3F3',
          borderLeft: '4px solid #B22222',
          color: '#B22222',
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '960px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <p style={{ fontSize: '14px' }}>Error: {error}</p>
          <button
            onClick={() => setError(null)}
            style={{
              color: '#B22222',
              fontWeight: '600',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      <div style={{
        maxWidth: '960px',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#4B5320',
          marginBottom: '24px'
        }}>Available Tests</h2>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #E0E0E0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <label
                htmlFor="subject-filter"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4B5320',
                  marginBottom: '8px'
                }}
              >
                Subject
              </label>
              <select
                id="subject-filter"
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #E0E0E0',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  color: '#4B5320',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#D4A017')}
                onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
                aria-label="Filter by subject"
              >
                <option value="">All Subjects</option>
                {subjectOptions.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="class-filter"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4B5320',
                  marginBottom: '8px'
                }}
              >
                Class
              </label>
              <select
                id="class-filter"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #E0E0E0',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  color: '#4B5320',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#D4A017')}
                onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
                aria-label="Filter by class"
              >
                <option value="">All Classes</option>
                {classOptions.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={resetFilters}
            style={{
              marginTop: '16px',
              backgroundColor: '#D4A017',
              color: '#FFFFFF',
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#B8860B')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#D4A017')}
            aria-label="Reset filters"
          >
            Reset Filters
          </button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px'
        }}>
          {filteredTests.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              padding: '32px',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #E0E0E0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              gridColumn: '1 / -1'
            }}>
              <p style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#4B5320',
                marginBottom: '8px'
              }}>No tests available</p>
              <p style={{
                fontSize: '14px',
                color: '#4B5320'
              }}>Check back soon for new tests!</p>
            </div>
          ) : (
            filteredTests.map(test => {
              const batch = getStudentBatch(test);
              const isAvailable = isTestAvailable(test);
              return (
                <div
                  key={test._id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '24px',
                    borderRadius: '8px',
                    border: '1px solid #E0E0E0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    position: 'relative',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  }}
                  role="region"
                  aria-label={`Test: ${test.title}`}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: isAvailable ? '#D4A017' : '#FFF3F3',
                      color: isAvailable ? '#FFFFFF' : '#B22222'
                    }}
                  >
                    {isAvailable ? 'Available' : 'Not Available'}
                  </span>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#4B5320',
                    marginBottom: '16px'
                  }}>{test.title}</h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      backgroundColor: '#F8F9FA',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#4B5320'
                    }}>
                      <span style={{ fontWeight: '500', marginRight: '5px' }}>Subject:</span> {test.subject}
                    </div>
                    <div style={{
                      backgroundColor: '#F8F9FA',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#4B5320'
                    }}>
                      <span style={{ fontWeight: '500', marginRight: '5px' }}>Class:</span> {test.class}
                    </div>
                    <div style={{
                      backgroundColor: '#F8F9FA',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#4B5320'
                    }}>
                      <span style={{ fontWeight: '500', marginRight: '5px' }}>Duration:</span> {test.duration} mins
                    </div>
                    <div style={{
                      backgroundColor: '#F8F9FA',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#4B5320'
                    }}>
                      <span style={{ fontWeight: '500', marginRight: '5px' }}>Batch:</span> {batch?.name || 'Not Assigned'}
                    </div>
                    <div style={{
                      backgroundColor: '#F8F9FA',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#4B5320'
                    }}>
                      <span style={{ fontWeight: '500', marginRight: '5px' }}>Start:</span>{' '}
                      {batch ? new Date(batch.start).toLocaleString() : 'N/A'}
                    </div>
                    <div style={{
                      backgroundColor: '#F8F9FA',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#4B5320'
                    }}>
                      <span style={{ fontWeight: '500', marginRight: '5px' }}>End:</span>{' '}
                      {batch ? new Date(batch.end).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleTakeTest(test._id, test.title)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'center',
                      padding: '10px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: isAvailable ? '#FFFFFF' : '#6B7280',
                      backgroundColor: isAvailable ? '#4B5320' : '#E0E0E0',
                      border: 'none',
                      cursor: isAvailable ? 'pointer' : 'not-allowed',
                      transition: 'background-color 0.2s, color 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (isAvailable) {
                        e.currentTarget.style.backgroundColor = '#D4A017';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (isAvailable) {
                        e.currentTarget.style.backgroundColor = '#4B5320';
                      }
                    }}
                    disabled={!isAvailable}
                    aria-label={`Take test: ${test.title}`}
                  >
                    {isAvailable ? 'Take Test' : 'Test Not Available'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Tests;