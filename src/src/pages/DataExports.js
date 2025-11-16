import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://waec-gfv0.onrender.com' : 'http://localhost:5000';

const DataExports = () => {
  // ... (All logic remains the same) ...
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filters, setFilters] = useState({
    studentClass: '',
    studentSubject: '',
    resultType: 'class',
    resultClass: '',
    resultSubject: '',
    resultStudent: '',
    reportSession: '',
  });
  const [signatureData, setSignatureData] = useState({
    className: '',
    classTeacherSignature: null,
    principalSignature: null,
  });

  useEffect(() => {
    fetchUsers();
    fetchClasses();
    fetchSubjects();
    fetchSessions();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const res = await axios.get(`${API_BASE_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users.');
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const res = await axios.get(`${API_BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(res.data?.map(cls => cls.name) || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load classes.');
      setSuccess(null);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const res = await axios.get(`${API_BASE_URL}/api/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubjects(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load subjects.');
      setSuccess(null);
    }
  };

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const res = await axios.get(`${API_BASE_URL}/api/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sessions.');
      setSuccess(null);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSignatureChange = (e) => {
    const { name, files } = e.target;
    setSignatureData(prev => ({ ...prev, [name]: files[0] }));
    setError(null);
    setSuccess(null);
  };

  const handleSignatureSubmit = async (e) => {
    e.preventDefault();
    if (user.role !== 'admin') {
      setError('Admin access required to upload signatures.');
      return;
    }
    if (!signatureData.className && !signatureData.principalSignature) {
      setError('Select a class for class teacher signature or upload a principal signature.');
      return;
    }
    const formData = new FormData();
    if (signatureData.className) formData.append('className', signatureData.className);
    if (signatureData.classTeacherSignature) {
      formData.append('classTeacherSignature', signatureData.classTeacherSignature);
    }
    if (signatureData.principalSignature) {
      formData.append('principalSignature', signatureData.principalSignature);
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      await axios.post(`${API_BASE_URL}/api/signatures/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Signatures uploaded successfully.');
      setSignatureData({ className: '', classTeacherSignature: null, principalSignature: null });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload signatures.');
      setSuccess(null);
    }
  };

  const exportStudents = () => {
    let filteredUsers = users.filter(user => user.role === 'student');
    if (filters.studentClass) {
      filteredUsers = filteredUsers.filter(user => user.class === filters.studentClass);
    }
    if (filters.studentSubject) {
      filteredUsers = filteredUsers.filter(user =>
        user.enrolledSubjects?.some(sub => sub.subject === filters.studentSubject)
      );
    }
    const data = filteredUsers.map(user => ({
      username: user.username || 'N/A',
      name: user.name || 'N/A',
      surname: user.surname || 'N/A',
      class: user.class || 'N/A',
      subjects: user.enrolledSubjects?.map(s => s.subject).join(';') || 'N/A',
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-GB') : 'N/A',
      sex: user.sex || 'N/A',
      age: user.age || 'N/A',
      address: user.address || 'N/A',
      phoneNumber: user.phoneNumber || 'N/A',
      picture: user.picture || 'N/A',
    }));
    if (data.length === 0) {
      setError('No students found for the selected filters.');
      return;
    }
    const csv = Papa.unparse(data);
    downloadCSV(csv, `students_export_${filters.studentClass || 'all'}_${filters.studentSubject || 'all'}.csv`);
    setSuccess('Students exported successfully.');
    setError(null);
  };

  const exportResults = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      let endpoint = '';
      let filename = '';
      if (filters.resultType === 'class' && filters.resultClass) {
        const className = encodeURIComponent(filters.resultClass.replace(/[^a-zA-Z0-9_-]/g, '')); // Sanitize
        const subjectId = filters.resultSubject
          ? encodeURIComponent(filters.resultSubject.replace(/[^a-zA-Z0-9_-]/g, '')) // Sanitize
          : 'all';
        if (!className) throw new Error('Invalid class name');
        endpoint = `${API_BASE_URL}/api/results/export/class/${className}/subject/${subjectId}`;
        filename = `results_${className}_${subjectId}.csv`;
      } else if (filters.resultType === 'student' && filters.resultStudent && filters.reportSession) {
        const sanitizedSession = encodeURIComponent(
          filters.reportSession.replace(/[/:]/g, '/').replace(/\s+/g, ' ').trim()
        );
        endpoint = `${API_BASE_URL}/api/results/export/student/${encodeURIComponent(filters.resultStudent)}/session/${sanitizedSession}`;
        filename = `results_student_${filters.resultStudent}_${sanitizedSession.replace(/[/\s]/g, '_')}.csv`;
      } else {
        setError('Please select valid filters for result export.');
        return;
      }
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.data || res.data.length === 0) {
        setError('No results found for the selected filters.');
        return;
      }
      downloadCSV(res.data, filename);
      setSuccess('Results exported successfully.');
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to export results.';
      setError(errorMessage);
      setSuccess(null);
    }
  };

  const exportReportCard = async () => {
    try {
      if (!filters.resultStudent || !filters.reportSession) {
        setError('Please select a student and session for report card export.');
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      const sanitizedSession = encodeURIComponent(
        filters.reportSession.replace(/[/:]/g, '/').replace(/\s+/g, ' ').trim()
      );
      const endpoint = `${API_BASE_URL}/api/reports/export/report/${encodeURIComponent(filters.resultStudent)}/${sanitizedSession}`;
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${filters.resultStudent}_${sanitizedSession.replace(/[/\s]/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Report card exported successfully.');
      setError(null);
    } catch (err) {
      let errorMessage = 'Failed to export report card.';
      if (err.response) {
        if (err.response.status === 404) {
          errorMessage = 'No results found for the selected student and session.';
        } else if (err.response.data?.error) {
          errorMessage = err.response.data.error;
        }
      }
      setError(errorMessage);
      setSuccess(null);
    }
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <p style={{ padding: '20px', color: '#3498db', backgroundColor: '#b8c2cc', textAlign: 'center', fontFamily: '"Fredoka", sans-serif', fontSize: '16px', minHeight: '100vh' }}>
        Loading...
      </p>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: '"Fredoka", sans-serif', 
      backgroundColor: '#b8c2cc', 
      minHeight: '100vh' 
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {error && (
          <p style={{ backgroundColor: '#FFF3F3', color: '#B22222', borderLeft: '4px solid #B22222', padding: '15px', marginBottom: '20px', borderRadius: '4px', fontSize: '14px' }}>
            Error: {error}
          </p>
        )}
        {success && (
          <p style={{ backgroundColor: '#E6FFE6', color: '#228B22', borderLeft: '4px solid #228B22', padding: '15px', marginBottom: '20px', borderRadius: '4px', fontSize: '14px' }}>
            Success: {success}
          </p>
        )}
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', backgroundColor: '#2c3e50', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
          Data Exports
        </h3>
        {/* Export Students Section */}
        <div style={{ marginBottom: '30px', backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h4 style={{ fontSize: '16px', color: '#2c3e50', marginBottom: '15px', fontWeight: '600' }}>Export Students</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
            <select
              name="studentClass"
              value={filters.studentClass}
              onChange={handleFilterChange}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #3498db', fontSize: '14px' }}
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <select
              name="studentSubject"
              value={filters.studentSubject}
              onChange={handleFilterChange}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #3498db', fontSize: '14px' }}
            >
              <option value="">All Subjects</option>
              {subjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
            <button
              onClick={exportStudents}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3498db',
                color: '#2c3e50',
                border: '1px solid #000000',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Export Students
            </button>
          </div>
        </div>
        {/* Export Results Section */}
        <div style={{ marginBottom: '30px', backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h4 style={{ fontSize: '16px', color: '#2c3e50', marginBottom: '15px', fontWeight: '600' }}>Export Results</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
            <select
              name="resultType"
              value={filters.resultType}
              onChange={handleFilterChange}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #3498db', fontSize: '14px' }}
            >
              <option value="class">Class Results</option>
              <option value="student">Student Results</option>
            </select>
            {filters.resultType === 'class' && (
              <>
                <select
                  name="resultClass"
                  value={filters.resultClass}
                  onChange={handleFilterChange}
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #3498db', fontSize: '14px' }}
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                <select
                  name="resultSubject"
                  value={filters.resultSubject}
                  onChange={handleFilterChange}
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #3498db', fontSize: '14px' }}
                >
                  <option value="">All Subjects</option>
                  {subjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </>
            )}
            {filters.resultType === 'student' && (
              <>
                <select
                  name="resultStudent"
                  value={filters.resultStudent}
                  onChange={handleFilterChange}
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #3498db', fontSize: '14px' }}
                >
                  <option value="">Select Student</option>
                  {users.filter(u => u.role === 'student').map(user => (
                    <option key={user._id} value={user._id}>{`${user.name || 'N/A'} ${user.surname || 'N/A'}`}</option>
                  ))}
                </select>
                <select
                  name="reportSession"
                  value={filters.reportSession}
                  onChange={handleFilterChange}
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #3498db', fontSize: '14px' }}
                >
                  <option value="">Select Session</option>
                  {sessions.map(session => (
                    <option key={session._id} value={session.sessionName}>{session.sessionName}</option>
                  ))}
                </select>
              </>
            )}
            <button
              onClick={exportResults}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3498db',
                color: '#2c3e50',
                border: '1px solid #000000',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Export Results
            </button>
          </div>
        </div>
        {/* Export Report Card Section */}
        <div style={{ marginBottom: '30px', backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h4 style={{ fontSize: '16px', color: '#2c3e50', marginBottom: '15px', fontWeight: '600' }}>Export Report Card</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
            <select
              name="resultStudent"
              value={filters.resultStudent}
              onChange={handleFilterChange}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #3498db', fontSize: '14px' }}
            >
              <option value="">Select Student</option>
              {users.filter(u => u.role === 'student').map(user => (
                <option key={user._id} value={user._id}>{`${user.name || 'N/A'} ${user.surname || 'N/A'}`}</option>
              ))}
            </select>
            <select
              name="reportSession"
              value={filters.reportSession}
              onChange={handleFilterChange}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #3498db', fontSize: '14px' }}
            >
              <option value="">Select Session</option>
              {sessions.map(session => (
                <option key={session._id} value={session.sessionName}>{session.sessionName}</option>
              ))}
            </select>
            <button
              onClick={exportReportCard}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3498db',
                color: '#2c3e50',
                border: '1px solid #000000',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Export Report Card
            </button>
          </div>
        </div>
        {user.role === 'admin' && (
          <div style={{ marginBottom: '30px', backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ fontSize: '16px', color: '#2c3e50', marginBottom: '15px', fontWeight: '600' }}>Upload Signatures for Report Cards</h4>
            <form onSubmit={handleSignatureSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
              <div>
                <label style={{ fontSize: '14px', color: '#2c3e50', marginBottom: '5px', display: 'block' }}>
                  Class (Optional for Principal's Signature)
                </label>
                <select
                  name="className"
                  value={signatureData.className}
                  onChange={(e) => setSignatureData(prev => ({ ...prev, className: e.target.value }))}
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #3498db', fontSize: '14px', width: '100%' }}
                >
                  <option value="">Select Class (Optional)</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '14px', color: '#2c3e50', marginBottom: '5px', display: 'block' }}>
                  Class Teacher's Signature (Per Class, on Report Card)
                </label>
                <input
                  type="file"
                  name="classTeacherSignature"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleSignatureChange}
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #3498db', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: '#2c3e50', marginBottom: '5px', display: 'block' }}>
                  Principal's Signature (Global, on All Report Cards)
                </label>
                <input
                  type="file"
                  name="principalSignature"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleSignatureChange}
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #3498db', fontSize: '14px' }}
                />
              </div>
              <button
                type="submit"
                  style={{
                  padding: '10px 20px',
                  backgroundColor: '#3498db',
                  color: '#2c3e50',
                  border: '1px solid #000000',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Upload Signatures
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataExports;