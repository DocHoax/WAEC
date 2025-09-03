import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import useTeacherData from '../../hooks/useTeacherData';
import { FiDownload, FiUpload, FiAlertTriangle, FiCheckCircle, FiClock } from 'react-icons/fi';

const BulkImport = () => {
  const { user, fetchQuestions, error, success, setError, setSuccess, navigate } = useTeacherData();
  const [csvFile, setCsvFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    if (user && user.role === 'teacher' && user.subjects) {
      console.log('Teacher subjects:', user.subjects);
      setSubjects([...new Set(user.subjects.map(s => s.subject))].sort());
      setClasses([...new Set(user.subjects.map(s => s.class))].sort());
    } else if (!user) {
      setError('Session expired. Please log in again.');
      navigate('/login');
    }
  }, [user, setError, navigate]);

  const handleDownloadTemplate = () => {
    const template = 'text,option1,option2,option3,option4,correctAnswer,marks,imageName\nWhat is \\( x^2 + 2x + 1 \\)?,x+1,(x+1)^2,x^2,2x,(x+1)^2,2,quadratic.jpg\nWhat is a noun?,Person,Action,Color,None of the above,Person,1,\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'question_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    setSuccess('CSV template downloaded successfully.');
  };

  const handleBulkQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      setError('Please select a CSV file.');
      return;
    }
    if (!selectedSubject || !selectedClass) {
      setError('Please select a subject and class.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      Papa.parse(csvFile, {
        complete: async (result) => {
          const questions = result.data
            .filter(row => row.text && row.text.trim() && !row.text.startsWith('Note:'))
            .map(row => ({
              subject: selectedSubject,
              class: selectedClass,
              text: row.text?.trim(),
              options: [row.option1, row.option2, row.option3, row.option4].filter(opt => opt?.trim()),
              correctAnswer: row.correctAnswer?.trim(),
              marks: parseFloat(row.marks) || 1,
              imageName: row.imageName?.trim() || '',
            }));
          console.log('Mapped questions:', questions);
          for (const q of questions) {
            if (!q.text || q.options.length < 2 || !q.correctAnswer || !q.marks) {
              throw new Error(`Invalid CSV: Missing required fields in question: ${JSON.stringify(q)}`);
            }
            if (q.imageName && !imageFiles.some(file => file.name === q.imageName)) {
              throw new Error(`Image file "${q.imageName}" not uploaded.`);
            }
            if (!q.options.includes(q.correctAnswer)) {
              throw new Error(`Correct answer "${q.correctAnswer}" not in options for question: ${q.text}`);
            }
            if (q.marks <= 0) {
              throw new Error(`Invalid marks "${q.marks}" for question: ${q.text}`);
            }
            if (!subjects.includes(q.subject) || !classes.includes(q.class)) {
              throw new Error(`Selected subject "${q.subject}" or class "${q.class}" not assigned to teacher.`);
            }
          }
          formData.append('questions', JSON.stringify(questions));
          imageFiles.forEach(file => formData.append('images', file));
          const token = localStorage.getItem('token');
          if (!token) throw new Error('No authentication token found.');
          console.log('Submitting bulk import:', { questions: questions.length, images: imageFiles.length });
          const res = await axios.post('https://waec-gfv0.onrender.com/api/questions/bulk', formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          });
          setSuccess(`Successfully imported ${res.data.count} questions to question bank.`);
          setCsvFile(null);
          setImageFiles([]);
          setSelectedSubject('');
          setSelectedClass('');
          fetchQuestions();
          navigate('/teacher/questions');
        },
        header: true,
        skipEmptyLines: true,
        error: (err) => {
          console.error('CSV parse error:', err.message);
          setError('Failed to parse CSV file. Ensure it follows the template format.');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('Bulk question submit error:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || 'Invalid data in CSV or images. Check format and try again.');
      } else {
        setError(err.message || 'Failed to import questions. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type !== 'text/csv') {
      setError('Please upload a valid CSV file.');
      return;
    }
    setCsvFile(file);
    setError(null);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    if (files.length !== e.target.files.length) {
      setError('Only image files (e.g., .jpg, .png) are allowed.');
      return;
    }
    setImageFiles(files);
    setError(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>Bulk Question Import</h2>
        <p style={styles.headerSubtitle}>Add questions with LaTeX, marks, and images to your question bank</p>
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

      <div style={styles.instructionCard}>
        <h3 style={styles.instructionTitle}>How to Import Questions</h3>
        <ol style={styles.instructionSteps}>
          <li>Download the CSV template.</li>
          <li>Fill with questions, using LaTeX for formulas (e.g., \\( x^2 \\)).</li>
          <li>Include image filenames and marks if needed.</li>
          <li>Select subject and class below.</li>
          <li>Upload CSV and images.</li>
        </ol>
        <button onClick={handleDownloadTemplate} style={styles.downloadButton}>
          <FiDownload style={styles.buttonIcon} />
          Download CSV Template
        </button>
      </div>

      <div style={styles.formatExample}>
        <h3 style={styles.exampleTitle}>CSV Format</h3>
        <div style={styles.codeBlock}>
          <pre style={styles.codePre}>
            text,option1,option2,option3,option4,correctAnswer,marks,imageName{"\n"}
            What is \\( x^2 + 2x + 1 \\)?,x+1,(x+1)^2,x^2,2x,(x+1)^2,2,quadratic.jpg{"\n"}
            What is a noun?,Person,Action,Color,None of the above,Person,1,{"\n"}
          </pre>
        </div>
        <p style={styles.exampleNote}>
          Use LaTeX for formulas (e.g., \\( \\frac{1}{2} \\)). Include imageName and marks if needed.
        </p>
      </div>

      <form onSubmit={handleBulkQuestionSubmit} style={styles.uploadForm}>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Select Subject</label>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            style={styles.formInput}
            required
          >
            <option value="">Choose a subject</option>
            {subjects.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Select Class</label>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            style={styles.formInput}
            required
          >
            <option value="">Choose a class</option>
            {classes.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Select CSV File</label>
          <div style={styles.fileUpload}>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              required
              style={styles.fileInput}
            />
            <div style={styles.filePreview}>
              {csvFile ? (
                <span style={styles.fileName}>{csvFile.name}</span>
              ) : (
                <span style={styles.filePlaceholder}>Drag & drop CSV file or click to browse</span>
              )}
            </div>
          </div>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Select Image Files (Optional)</label>
          <div style={styles.fileUpload}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              style={styles.fileInput}
            />
            <div style={styles.filePreview}>
              {imageFiles.length > 0 ? (
                <span style={styles.fileName}>
                  {imageFiles.map(file => file.name).join(', ')}
                </span>
              ) : (
                <span style={styles.filePlaceholder}>Drag & drop images or click to browse</span>
              )}
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.submitButton,
            backgroundColor: loading ? '#E0E0E0' : '#4B5320',
          }}
        >
          {loading ? (
            <>
              <FiClock style={styles.buttonIcon} />
              Processing...
            </>
          ) : (
            <>
              <FiUpload style={styles.buttonIcon} />
              Import Questions
            </>
          )}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'sans-serif',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    maxWidth: '800px',
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
  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
    marginBottom: '25px',
  },
  instructionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 15px 0',
  },
  instructionSteps: {
    paddingLeft: '25px',
    margin: '0 0 20px 0',
    color: '#4B5320',
    lineHeight: '1.6',
  },
  downloadButton: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s',
  },
  buttonIcon: {
    fontSize: '18px',
  },
  formatExample: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
    marginBottom: '25px',
  },
  exampleTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 15px 0',
  },
  exampleNote: {
    fontSize: '14px',
    color: '#6B7280',
    marginTop: '10px',
  },
  codeBlock: {
    backgroundColor: '#2D3748',
    color: '#E2E8F0',
    borderRadius: '6px',
    padding: '15px',
    overflowX: 'auto',
    fontFamily: 'monospace',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  codePre: {
    margin: '0',
  },
  uploadForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
  },
  formGroup: {
    marginBottom: '20px',
  },
  formLabel: {
    display: 'block',
    marginBottom: '10px',
    color: '#4B5320',
    fontWeight: '600',
  },
  formInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #D3D3D3',
    borderRadius: '4px',
    fontSize: '14px',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  fileUpload: {
    position: 'relative',
  },
  fileInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: '0',
    cursor: 'pointer',
  },
  filePreview: {
    border: '2px dashed #CBD5E0',
    borderRadius: '6px',
    padding: '30px',
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
    transition: 'all 0.2s',
  },
  fileName: {
    color: '#4B5320',
    fontWeight: '500',
  },
  filePlaceholder: {
    color: '#718096',
  },
  submitButton: {
    width: '100%',
    color: '#FFFFFF',
    border: 'none',
    padding: '15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.2s',
  },
};

export default BulkImport;