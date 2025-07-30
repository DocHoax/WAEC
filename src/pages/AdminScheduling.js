import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { FiSave, FiX, FiAlertTriangle, FiCheckCircle, FiUpload, FiUsers } from 'react-icons/fi';

const AdminScheduling = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [batches, setBatches] = useState([{ name: 'Batch A', students: [], schedule: { start: '', end: '' } }]);
  const [csvFile, setCsvFile] = useState(null);
  const [autoAssign, setAutoAssign] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        navigate('/login');
        return;
      }
      try {
        const [testsRes, studentsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/tests/admin', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5000/api/users?role=student', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        console.log('AdminScheduling - Fetched tests:', testsRes.data);
        console.log('AdminScheduling - Fetched students:', studentsRes.data);
        setTests(testsRes.data.filter(t => t.status === 'draft' || t.status === 'scheduled'));
        setStudents(studentsRes.data);
        setLoading(false);
      } catch (err) {
        console.error('AdminScheduling - Error:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to load data.');
        setLoading(false);
      }
    };

    if (user && user.role === 'admin') {
      fetchData();
    } else {
      setError('Access restricted to admins.');
      setLoading(false);
    }
  }, [user, navigate]);

  const handleAddBatch = () => {
    const newBatchName = `Batch ${String.fromCharCode(65 + batches.length)}`;
    setBatches([...batches, { name: newBatchName, students: [], schedule: { start: '', end: '' } }]);
  };

  const handleBatchChange = (index, field, value) => {
    const newBatches = [...batches];
    if (field === 'students') {
      newBatches[index].students = value;
    } else if (field === 'start' || field === 'end') {
      newBatches[index].schedule[field] = value;
    } else {
      newBatches[index][field] = value;
    }
    setBatches(newBatches);
  };

  const handleCsvUpload = (e) => {
    setCsvFile(e.target.files[0]);
  };

  const parseCsv = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.split(','));
        if (rows[0][0].toLowerCase() !== 'username' || rows[0][1].toLowerCase() !== 'batch') {
          reject('CSV must have headers: username,batch');
        }
        const assignments = rows.slice(1).reduce((acc, [username, batchName]) => {
          const student = students.find(s => s.username === username.trim());
          if (student) {
            const batchIndex = acc.findIndex(b => b.name === batchName.trim());
            if (batchIndex >= 0) {
              acc[batchIndex].students.push(student._id);
            } else {
              acc.push({ name: batchName.trim(), students: [student._id], schedule: { start: '', end: '' } });
            }
          }
          return acc;
        }, []);
        resolve(assignments);
      };
      reader.onerror = () => reject('Error reading CSV');
      reader.readAsText(file);
    });
  };

  const handleAutoAssign = () => {
    const selectedTest = tests.find(t => t._id === selectedTestId);
    const classStudents = students.filter(s => s.enrolledSubjects?.some(sub => sub.class === selectedTest?.class));
    const batchCount = batches.length;
    const studentsPerBatch = Math.ceil(classStudents.length / batchCount);
    const newBatches = batches.map((batch, index) => ({
      ...batch,
      students: classStudents.slice(index * studentsPerBatch, (index + 1) * studentsPerBatch).map(s => s._id),
    }));
    setBatches(newBatches);
  };

  const handleSubmit = async () => {
    if (!selectedTestId || batches.some(b => !b.schedule.start || !b.schedule.end || new Date(b.schedule.start) >= new Date(b.schedule.end))) {
      setError('Select a test and ensure all batches have valid schedules.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      let finalBatches = [...batches];
      if (csvFile) {
        finalBatches = await parseCsv(csvFile);
        setBatches(finalBatches);
      } else if (autoAssign && selectedTestId) {
        handleAutoAssign();
        finalBatches = batches;
      }
      const payload = {
        status: 'scheduled',
        batches: finalBatches.map(b => ({
          name: b.name,
          students: b.students,
          schedule: {
            start: new Date(b.schedule.start).toISOString(),
            end: new Date(b.schedule.end).toISOString(),
          },
        })),
      };
      console.log('AdminScheduling - Sending payload:', payload);
      await axios.put(`http://localhost:5000/api/tests/${selectedTestId}/schedule`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Test scheduled successfully.');
      setTests(tests.filter(t => t._id !== selectedTestId));
      setSelectedTestId(null);
      setBatches([{ name: 'Batch A', students: [], schedule: { start: '', end: '' } }]);
      setCsvFile(null);
      setAutoAssign(false);
    } catch (err) {
      console.error('AdminScheduling - Error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to schedule test.');
    }
    setLoading(false);
  };

  const loadTestBatches = (testId) => {
    const test = tests.find(t => t._id === testId);
    if (test && test.batches?.length > 0) {
      setBatches(test.batches.map(b => ({
        name: b.name,
        students: b.students.map(id => id.toString()),
        schedule: {
          start: new Date(b.schedule.start).toISOString().slice(0, 16),
          end: new Date(b.schedule.end).toISOString().slice(0, 16),
        },
      })));
    } else {
      setBatches([{ name: 'Batch A', students: [], schedule: { start: '', end: '' } }]);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div style={styles.accessDenied}>
        <h2>Access Restricted</h2>
        <p>This page is only available to admins.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>Test Scheduling</h2>
        <p style={styles.headerSubtitle}>Assign batches and schedules for tests</p>
      </div>

      {error && (
        <div style={styles.alertError}>
          <FiAlertTriangle style={styles.alertIcon} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={styles.alertSuccess}>
          <FiCheckCircle style={styles.alertIcon} />
          <span>{success}</span>
        </div>
      )}

      <div style={styles.section}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Select Test*</label>
          <select
            value={selectedTestId || ''}
            onChange={(e) => {
              setSelectedTestId(e.target.value);
              loadTestBatches(e.target.value);
            }}
            style={styles.select}
          >
            <option value="">Select a test</option>
            {tests.map(test => (
              <option key={test._id} value={test._id}>{test.title} - {test.subject} ({test.class})</option>
            ))}
          </select>
        </div>

        {selectedTestId && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Batch Assignment</label>
              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="autoAssign"
                  checked={autoAssign}
                  onChange={(e) => setAutoAssign(e.target.checked)}
                  style={styles.checkbox}
                />
                <label htmlFor="autoAssign" style={styles.checkboxLabel}>Auto-assign students</label>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Upload CSV (username,batch)</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  style={styles.input}
                />
              </div>
            </div>

            {batches.map((batch, index) => (
              <div key={index} style={styles.batchSection}>
                <h4 style={styles.batchTitle}>Batch {batch.name}</h4>
                {!autoAssign && !csvFile && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Students</label>
                    <select
                      multiple
                      value={batch.students}
                      onChange={(e) => handleBatchChange(index, 'students', Array.from(e.target.selectedOptions, option => option.value))}
                      style={{ ...styles.select, height: '100px' }}
                    >
                      {students
                        .filter(s => s.enrolledSubjects?.some(sub => sub.class === tests.find(t => t._id === selectedTestId)?.class))
                        .map(student => (
                          <option key={student._id} value={student._id}>
                            {student.name || student.username} ({student.username})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Start Date & Time*</label>
                  <input
                    type="datetime-local"
                    value={batch.schedule.start}
                    onChange={(e) => handleBatchChange(index, 'start', e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>End Date & Time*</label>
                  <input
                    type="datetime-local"
                    value={batch.schedule.end}
                    onChange={(e) => handleBatchChange(index, 'end', e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={handleAddBatch}
              style={styles.addButton}
            >
              <FiUsers style={styles.buttonIcon} /> Add Batch
            </button>
          </>
        )}

        <div style={styles.formActions}>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            style={styles.cancelButton}
          >
            <FiX style={styles.buttonIcon} /> Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedTestId}
            style={selectedTestId ? styles.submitButton : { ...styles.submitButton, backgroundColor: '#ccc', cursor: 'not-allowed' }}
          >
            <FiSave style={styles.buttonIcon} /> Schedule Test
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'sans-serif',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  header: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    padding: '25px',
    borderRadius: '8px',
    marginBottom: '25px',
    border: '1px solid #000000',
    boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  headerSubtitle: {
    fontSize: '16px',
    margin: '0',
    color: '#D4A017',
  },
  alertError: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    borderLeft: '4px solid #B22222',
    padding: '15px',
    marginBottom: '25px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertSuccess: {
    backgroundColor: '#d4edda',
    color: '#155724',
    borderLeft: '4px solid #28a745',
    padding: '15px',
    marginBottom: '25px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertIcon: {
    fontSize: '20px',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
    marginBottom: '25px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  },
  label: {
    color: '#4B5320',
    fontWeight: '600',
    fontSize: '14px',
  },
  input: {
    padding: '12px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    fontSize: '16px',
  },
  select: {
    padding: '12px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    fontSize: '16px',
    backgroundColor: 'white',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#4B5320',
  },
  checkboxLabel: {
    color: '#4B5320',
    fontSize: '14px',
  },
  batchSection: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px',
    border: '1px solid #E0E0E0',
  },
  batchTitle: {
    color: '#4B5320',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
  },
  formActions: {
    display: 'flex',
    gap: '15px',
    marginTop: '30px',
    justifyContent: 'flex-end',
  },
  submitButton: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    color: '#4B5320',
    border: '1px solid #4B5320',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  addButton: {
    backgroundColor: '#D4A017',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  buttonIcon: {
    fontSize: '18px',
  },
  loading: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: '16px',
    color: '#4B5320',
  },
  accessDenied: {
    textAlign: 'center',
    padding: '4rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    margin: '2rem auto',
  },
};

export default AdminScheduling;