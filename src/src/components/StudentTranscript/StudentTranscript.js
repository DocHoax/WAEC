import React, { useState } from 'react';
import { transcriptAPI } from '../../api/transcript';

const StudentTranscript = ({ studentId, studentName }) => {
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTranscript = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await transcriptAPI.getTranscript(studentId);
      setTranscript(response.data);
    } catch (err) {
      console.error('Error fetching transcript:', err);
      setError('Failed to fetch transcript');
    }
    setLoading(false);
  };

  const downloadTranscript = () => {
    // This would typically generate a PDF
    // For now, we'll just show a message
    alert('PDF download functionality would be implemented here');
  };

  return (
    <div style={styles.container}>
      <h3>Student Transcript</h3>
      <button 
        onClick={fetchTranscript} 
        disabled={loading}
        style={styles.button}
      >
        {loading ? 'Loading...' : 'View Transcript'}
      </button>

      {error && <div style={styles.error}>{error}</div>}

      {transcript && (
        <div style={styles.transcript}>
          <div style={styles.header}>
            <h4>Transcript for {transcript.student.name}</h4>
            <p>Student ID: {transcript.student.studentId}</p>
            <p>Class: {transcript.student.class}</p>
          </div>

          <button 
            onClick={downloadTranscript}
            style={styles.downloadButton}
          >
            Download PDF
          </button>

          <div style={styles.records}>
            {transcript.records.map((record, index) => (
              <div key={index} style={styles.record}>
                <h5>{record.session} - {record.term} Term ({record.class})</h5>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Subject</th>
                      <th style={styles.th}>Score</th>
                      <th style={styles.th}>Grade</th>
                      <th style={styles.th}>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.grades.map((grade, i) => (
                      <tr key={i}>
                        <td style={styles.td}>{grade.subject}</td>
                        <td style={styles.td}>{grade.score}</td>
                        <td style={styles.td}>{grade.grade}</td>
                        <td style={styles.td}>{grade.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={styles.summary}>
                  <p>Total Score: {record.totalScore}</p>
                  <p>Average: {record.average}</p>
                  <p>Position: {record.position}</p>
                  <p>Promoted: {record.promoted ? 'Yes' : 'No'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    margin: '20px 0',
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '4px'
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  error: {
    color: 'red',
    margin: '10px 0'
  },
  transcript: {
    marginTop: '20px'
  },
  header: {
    marginBottom: '15px',
    paddingBottom: '15px',
    borderBottom: '1px solid #eee'
  },
  downloadButton: {
    padding: '8px 16px',
    backgroundColor: '#D4A017',
    color: 'black',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '15px'
  },
  records: {
    marginTop: '15px'
  },
  record: {
    marginBottom: '25px',
    padding: '15px',
    border: '1px solid #eee',
    borderRadius: '4px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '10px 0'
  },
  th: {
    border: '1px solid #ddd',
    padding: '8px',
    backgroundColor: '#f2f2f2',
    textAlign: 'left'
  },
  td: {
    border: '1px solid #ddd',
    padding: '8px'
  },
  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '10px'
  }
};

export default StudentTranscript;