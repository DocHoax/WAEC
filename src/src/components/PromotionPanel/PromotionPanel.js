import React, { useState, useEffect } from 'react';
import { promotionAPI } from '../../api/promotion';

const PromotionPanel = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [session, setSession] = useState('');
  const [term, setTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [targetClass, setTargetClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchClasses();
    // Set current academic session and term
    setSession('2023/2024');
    setTerm('Third');
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await promotionAPI.getClasses();
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setMessage('Error fetching classes');
    }
  };

  const fetchEligibleStudents = async () => {
    if (!selectedClass || !session || !term) return;
    
    setLoading(true);
    try {
      const response = await promotionAPI.getEligibleStudents(selectedClass, session, term);
      setStudents(response.data);
      setMessage('');
    } catch (error) {
      console.error('Error fetching students:', error);
      setMessage('Error fetching students');
    }
    setLoading(false);
  };

  const handleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  const promoteStudents = async () => {
    if (selectedStudents.length === 0 || !targetClass) {
      setMessage('Please select students and target class');
      return;
    }

    setLoading(true);
    try {
      await promotionAPI.promoteStudents(selectedStudents, targetClass, session, term);
      setMessage('Students promoted successfully');
      setSelectedStudents([]);
      fetchEligibleStudents(); // Refresh the list
    } catch (error) {
      console.error('Error promoting students:', error);
      setMessage('Error promoting students');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Student Promotion Panel</h2>
      
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Class:</label>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            style={styles.select}
          >
            <option value="">Select Class</option>
            {classes.map(cls => (
              <option key={cls._id} value={cls._id}>{cls.name}</option>
            ))}
          </select>
        </div>
        
        <div style={styles.filterGroup}>
          <label style={styles.label}>Session:</label>
          <input 
            type="text" 
            value={session} 
            onChange={(e) => setSession(e.target.value)}
            style={styles.input}
          />
        </div>
        
        <div style={styles.filterGroup}>
          <label style={styles.label}>Term:</label>
          <select 
            value={term} 
            onChange={(e) => setTerm(e.target.value)}
            style={styles.select}
          >
            <option value="First">First</option>
            <option value="Second">Second</option>
            <option value="Third">Third</option>
          </select>
        </div>
        
        <button 
          onClick={fetchEligibleStudents} 
          disabled={!selectedClass || !session || !term}
          style={styles.button}
        >
          Fetch Students
        </button>
      </div>

      {message && <div style={styles.message}>{message}</div>}

      {students.length > 0 && (
        <>
          <div style={styles.studentList}>
            <h3>Students in {classes.find(c => c._id === selectedClass)?.name}</h3>
            {students.map(student => (
              <div key={student._id} style={styles.studentItem}>
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student._id)}
                  onChange={() => handleStudentSelection(student._id)}
                  style={styles.checkbox}
                />
                <span style={styles.studentName}>{student.name}</span>
                <span style={styles.studentId}>({student.studentId})</span>
              </div>
            ))}
          </div>

          <div style={styles.promotionSection}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Promote to:</label>
              <select 
                value={targetClass} 
                onChange={(e) => setTargetClass(e.target.value)}
                style={styles.select}
              >
                <option value="">Select Target Class</option>
                {classes
                  .filter(cls => cls._id !== selectedClass)
                  .map(cls => (
                    <option key={cls._id} value={cls._id}>{cls.name}</option>
                  ))
                }
              </select>
            </div>
            
            <button 
              onClick={promoteStudents} 
              disabled={selectedStudents.length === 0 || !targetClass || loading}
              style={styles.promoteButton}
            >
              {loading ? 'Processing...' : `Promote ${selectedStudents.length} Students`}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto'
  },
  title: {
    textAlign: 'center',
    color: '#4B5320',
    marginBottom: '30px'
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px',
    marginBottom: '20px',
    alignItems: 'flex-end'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    marginBottom: '5px',
    fontWeight: 'bold'
  },
  select: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc'
  },
  input: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc'
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    height: 'fit-content'
  },
  message: {
    padding: '10px',
    margin: '10px 0',
    borderRadius: '4px',
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },
  studentList: {
    margin: '20px 0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '15px'
  },
  studentItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    borderBottom: '1px solid #eee'
  },
  checkbox: {
    marginRight: '10px'
  },
  studentName: {
    fontWeight: 'bold',
    marginRight: '10px'
  },
  studentId: {
    color: '#666'
  },
  promotionSection: {
    display: 'flex',
    gap: '15px',
    alignItems: 'flex-end',
    marginTop: '20px'
  },
  promoteButton: {
    padding: '10px 20px',
    backgroundColor: '#D4A017',
    color: 'black',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default PromotionPanel;