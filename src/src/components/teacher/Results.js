import React from 'react';
import { useParams } from 'react-router-dom';
import useTeacherData from '../../hooks/useTeacherData';

const Results = () => {
  const { results, error, success } = useTeacherData();
  const { testId, studentId } = useParams();

  const filteredResults = results.filter(result =>
    (testId ? result.testId === testId : true) &&
    (studentId ? result.studentId === studentId : true)
  );

  return (
    <div>
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px',
          borderLeft: '4px solid #dc3545',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '10px', fontSize: '20px' }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px',
          borderLeft: '4px solid #28a745',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '10px', fontSize: '20px' }}>✅</span>
          <span>{success}</span>
        </div>
      )}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '25px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{
          color: '#4B5320',
          marginTop: '0',
          marginBottom: '20px',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '10px' }}>📊</span>
          Student Results
        </h2>
        {filteredResults.length === 0 ? (
          <div style={{
            backgroundColor: '#fff8e1',
            borderLeft: '4px solid #FFD700',
            padding: '20px',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: '#4B5320' }}>
              No results found for {testId ? `test ${testId}` : studentId ? `student ${studentId}` : 'the selected criteria'}.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '20px'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#4B5320',
                  color: 'white'
                }}>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Student</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Test</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Score</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map(result => (
                  <tr key={`${result.testId}-${result.studentId}`} style={{
                    borderBottom: '1px solid #eee',
                    ':hover': { backgroundColor: '#f9f9f9' }
                  }}>
                    <td style={{ padding: '12px 15px' }}>{result.studentName}</td>
                    <td style={{ padding: '12px 15px' }}>{result.testTitle}</td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{
                        color: result.score >= 70 ? '#28a745' : result.score >= 50 ? '#FFD700' : '#dc3545',
                        fontWeight: '600'
                      }}>
                        {result.score}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      {new Date(result.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;