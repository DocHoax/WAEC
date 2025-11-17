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
          axios.get('https://waec-gfv0.onrender.com/api/tests/admin', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('https://waec-gfv0.onrender.com/api/users?role=student', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setTests(testsRes.data.filter(t => t.status === 'draft' || t.status === 'scheduled'));
        setStudents(studentsRes.data);
        setLoading(false);
      } catch (err) {
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
      await axios.put(`https://waec-gfv0.onrender.com/api/tests/${selectedTestId}/schedule`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Test scheduled successfully.');
      setTests(tests.filter(t => t._id !== selectedTestId));
      setSelectedTestId(null);
      setBatches([{ name: 'Batch A', students: [], schedule: { start: '', end: '' } }]);
      setCsvFile(null);
      setAutoAssign(false);
    } catch (err) {
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
    fontFamily: '"Fredoka", sans-serif',
    padding: '20px',
    backgroundColor: '#b8c2cc',
    minHeight: '100vh',
    animation: 'fadeIn 0.8s ease-in',
  },
  header: {
    backgroundColor: '#2c3e50',
    color: '#FFFFFF',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '25px',
    border: '1px solid #000000',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    animation: 'slideDown 0.6s ease-out'
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 0 10px 0',
  },
  headerSubtitle: {
    fontSize: '16px',
    margin: '0',
    color: '#3498db',
  },
  alertError: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    borderLeft: '4px solid #B22222',
    padding: '15px',
    marginBottom: '25px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    animation: 'shake 0.5s ease-in-out'
  },
  alertSuccess: {
    backgroundColor: '#d4edda',
    color: '#155724',
    borderLeft: '4px solid #28a745',
    padding: '15px',
    marginBottom: '25px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    animation: 'fadeInUp 0.6s ease-out'
  },
  alertIcon: {
    fontSize: '20px',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
    marginBottom: '25px',
    animation: 'fadeInUp 0.6s ease-out 0.2s both'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  },
  label: {
    color: '#2c3e50',
    fontWeight: '600',
    fontSize: '14px',
  },
  input: {
    padding: '12px',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'all 0.3s ease'
  },
  select: {
    padding: '12px',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: 'white',
    transition: 'all 0.3s ease'
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
    accentColor: '#2c3e50',
  },
  checkboxLabel: {
    color: '#2c3e50',
    fontSize: '14px',
    fontWeight: '500'
  },
  batchSection: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #E0E0E0',
    animation: 'fadeInUp 0.6s ease-out',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
  },
  batchTitle: {
    color: '#2c3e50',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '15px',
  },
  formActions: {
    display: 'flex',
    gap: '15px',
    marginTop: '30px',
    justifyContent: 'flex-end',
  },
  submitButton: {
    backgroundColor: '#2c3e50',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  cancelButton: {
    backgroundColor: 'transparent',
    color: '#2c3e50',
    border: '1px solid #2c3e50',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  addButton: {
    backgroundColor: '#3498db',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
    transition: 'all 0.3s ease'
  },
  buttonIcon: {
    fontSize: '18px',
  },
  loading: {
    minHeight: '100vh',
    backgroundColor: '#b8c2cc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Fredoka", sans-serif'
  },
  loadingText: {
    fontSize: '18px',
    color: '#2c3e50',
  },
  accessDenied: {
    textAlign: 'center',
    padding: '4rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    margin: '2rem auto',
    fontFamily: '"Fredoka", sans-serif',
    animation: 'fadeIn 0.8s ease-in'
  },
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
const keyframes = `
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
@keyframes slideDown {
  from { 
    opacity: 0;
    transform: translateY(-20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
`;

// Inject keyframes
if (styleSheet) {
  styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
}

// Add hover effects
const hoverStyles = `
  .batchSection:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 15px rgba(0,0,0,0.1);
  }
  .submitButton:hover:not([disabled]) {
    background-color: #1a252f;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  .cancelButton:hover {
    background-color: #2c3e50;
    color: #FFFFFF;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  .addButton:hover {
    background-color: #2980b9;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  input:focus, select:focus {
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    outline: none;
  }
`;

// Inject hover styles
if (styleSheet) {
  const hoverStyleElement = document.createElement('style');
  hoverStyleElement.textContent = hoverStyles;
  document.head.appendChild(hoverStyleElement);
}

export default AdminScheduling;