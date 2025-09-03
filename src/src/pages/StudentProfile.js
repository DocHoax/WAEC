import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axiosInstance';
import StudentTranscript from '../components/StudentTranscript/StudentTranscript';

const StudentProfile = () => {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/students/${id}`);
      setStudent(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching student:', err);
      setError('Failed to fetch student data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading student profile...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  if (!student) {
    return <div style={styles.error}>Student not found</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Student Profile</h2>
      </div>

      <div style={styles.profileCard}>
        <div style={styles.profileHeader}>
          <div style={styles.avatar}>
            {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div style={styles.profileInfo}>
            <h3 style={styles.studentName}>{student.name}</h3>
            <p style={styles.studentId}>Student ID: {student.studentId}</p>
            <p style={styles.studentClass}>Class: {student.class?.name || 'Not assigned'}</p>
          </div>
        </div>

        <div style={styles.details}>
          <div style={styles.detailSection}>
            <h4 style={styles.sectionTitle}>Personal Information</h4>
            <div style={styles.detailGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Email:</span>
                <span style={styles.detailValue}>{student.email || 'N/A'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Phone:</span>
                <span style={styles.detailValue}>{student.phone || 'N/A'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Date of Birth:</span>
                <span style={styles.detailValue}>
                  {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Gender:</span>
                <span style={styles.detailValue}>{student.gender || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div style={styles.detailSection}>
            <h4 style={styles.sectionTitle}>Academic Information</h4>
            <div style={styles.detailGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Class:</span>
                <span style={styles.detailValue}>{student.class?.name || 'Not assigned'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Status:</span>
                <span style={styles.detailValue}>
                  <span style={student.active ? styles.active : styles.inactive}>
                    {student.active ? 'Active' : 'Inactive'}
                  </span>
                </span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Enrollment Date:</span>
                <span style={styles.detailValue}>
                  {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Section */}
      <StudentTranscript studentId={student._id} studentName={student.name} />
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '30px'
  },
  title: {
    color: '#4B5320',
    fontSize: '28px',
    margin: 0
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '30px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #eee'
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#4B5320',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 'bold',
    marginRight: '20px'
  },
  profileInfo: {
    flex: 1
  },
  studentName: {
    fontSize: '24px',
    margin: '0 0 5px 0',
    color: '#333'
  },
  studentId: {
    margin: '0 0 5px 0',
    color: '#666'
  },
  studentClass: {
    margin: 0,
    color: '#666'
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },
  detailSection: {
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px'
  },
  sectionTitle: {
    margin: '0 0 15px 0',
    color: '#4B5320',
    fontSize: '18px'
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  detailLabel: {
    fontWeight: 'bold',
    color: '#555',
    fontSize: '14px'
  },
  detailValue: {
    color: '#333',
    fontSize: '16px'
  },
  active: {
    color: '#28a745',
    fontWeight: 'bold'
  },
  inactive: {
    color: '#dc3545',
    fontWeight: 'bold'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666'
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#dc3545',
    backgroundColor: '#f8d7da',
    borderRadius: '8px',
    margin: '20px'
  }
};

export default StudentProfile;