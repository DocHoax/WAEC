import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const QuestionBankPage = () => {
  const { user } = useContext(AuthContext);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    subject: '',
    class: '',
    text: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    image: null,
  });
  const [editingId, setEditingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    console.log('QuestionBank - Component mounted:', { user: user ? user.username : 'None' });
    const fetchQuestions = async () => {
      const token = localStorage.getItem('token');
      console.log('QuestionBank - Fetch questions:', { user: user?.username, token: token ? 'Present' : 'Absent' });
      if (!token) {
        setError('Please login again.');
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get('https://waec-gfv0.onrender.com/api/questions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('QuestionBank - Fetched questions:', res.data);
        setQuestions(res.data);
        setLoading(false);
      } catch (err) {
        console.error('QuestionBank - Fetch error:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to load questions.');
        setLoading(false);
      }
    };

    if (user && user.role === 'teacher') {
      fetchQuestions();
    } else {
      console.log('QuestionBank - Access denied:', { user: user?.username, role: user?.role });
      setError('Access restricted to teachers.');
      setLoading(false);
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...form.options];
    newOptions[index] = value;
    setForm({ ...form, options: newOptions });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setForm({ ...form, image: file });
    setPreviewImage(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login again.');
      return;
    }

    const formData = new FormData();
    formData.append('subject', form.subject);
    formData.append('class', form.class);
    formData.append('text', form.text);
    formData.append('options', JSON.stringify(form.options));
    formData.append('correctAnswer', form.correctAnswer);
    if (form.image) formData.append('image', form.image);

    try {
      if (editingId) {
        console.log('QuestionBank - Updating question:', { id: editingId });
        await axios.put(`https://waec-gfv0.onrender.com/api/questions/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
        console.log('QuestionBank - Update success');
      } else {
        console.log('QuestionBank - Creating question');
        await axios.post('https://waec-gfv0.onrender.com/api/questions', formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
        console.log('QuestionBank - Create success');
      }
      setForm({ subject: '', class: '', text: '', options: ['', '', '', ''], correctAnswer: '', image: null });
      setEditingId(null);
      setPreviewImage(null);
      const res = await axios.get('https://waec-gfv0.onrender.com/api/questions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions(res.data);
    } catch (err) {
      console.error('QuestionBank - Submit error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to save question.');
    }
  };

  const handleEdit = (question) => {
    console.log('QuestionBank - Editing question:', { id: question._id });
    setForm({
      subject: question.subject || '',
      class: question.class || '',
      text: question.text || '',
      options: question.options || ['', '', '', ''],
      correctAnswer: question.correctAnswer || '',
      image: null,
    });
    setEditingId(question._id);
    setPreviewImage(question.imageUrl || null);
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('token');
    console.log('QuestionBank - Deleting question:', { id });
    try {
      await axios.delete(`https://waec-gfv0.onrender.com/api/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('QuestionBank - Delete success');
      setQuestions(questions.filter((q) => q._id !== id));
    } catch (err) {
      console.error('QuestionBank - Delete error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to delete question.');
    }
  };

  if (loading) return (
    <div style={{
      backgroundColor: '#b8c2cc',
      fontFamily: '"Fredoka", sans-serif',
      minHeight: '100vh',
      padding: '20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <p style={{ fontSize: '1.2rem' }}>Loading...</p>
    </div>
  );
  if (!user || user.role !== 'teacher') return (
    <div style={{
      backgroundColor: '#b8c2cc',
      fontFamily: '"Fredoka", sans-serif',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <p>Access restricted to teachers.</p>
    </div>
  );
  if (error) return (
    <div style={{
      backgroundColor: '#b8c2cc',
      fontFamily: '"Fredoka", sans-serif',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <p>{error}</p>
    </div>
  );

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#b8c2cc',
      fontFamily: '"Fredoka", sans-serif',
      minHeight: '100vh',
      animation: 'slideIn 0.5s ease-out'
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        marginBottom: '2rem',
        transition: 'transform 0.3s ease'
      }}>
        <h2 style={{ color: '#4B5320', marginBottom: '1rem' }}>Question Bank</h2>
        <h3 style={{ color: '#4B5320', marginBottom: '1rem' }}>{editingId ? 'Edit Question' : 'Add New Question'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label>Subject:</label>
              <input
                type="text"
                name="subject"
                value={form.subject}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div>
              <label>Class:</label>
              <input
                type="text"
                name="class"
                value={form.class}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
          </div>
          
          <div>
            <label>Question Text:</label>
            <textarea
              name="text"
              value={form.text}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' }}
            />
          </div>
          
          <div>
            <label>Options:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {form.options.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  required
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              ))}
            </div>
          </div>
          
          <div>
            <label>Correct Answer:</label>
            <select
              name="correctAnswer"
              value={form.correctAnswer}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">Select correct answer</option>
              {form.options.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label>Image (optional):</label>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {previewImage && <img src={previewImage} alt="Preview" style={{ maxWidth: '200px', marginTop: '0.5rem', borderRadius: '4px' }} />}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#4B7043',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease'
            }}>
              {editingId ? 'Update Question' : 'Add Question'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setForm({ subject: '', class: '', text: '', options: ['', '', '', ''], correctAnswer: '', image: null });
                  setEditingId(null);
                  setPreviewImage(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease'
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ color: '#4B5320', marginBottom: '1rem' }}>Existing Questions</h3>
        {questions.length === 0 ? (
          <p>No questions available.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'left' }}>Subject</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'left' }}>Class</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'left' }}>Question</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'left' }}>Options</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'left' }}>Correct Answer</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'left' }}>Image</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, index) => (
                  <tr key={q._id} style={{
                    animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                    transition: 'background-color 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '';
                  }}>
                    <td style={{ padding: '0.75rem', border: '1px solid #dee2e6' }}>{q.subject}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #dee2e6' }}>{q.class}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #dee2e6', maxWidth: '200px', wordWrap: 'break-word' }}>{q.text || ''}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #dee2e6', maxWidth: '200px', wordWrap: 'break-word' }}>{q.options.join(', ')}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #dee2e6' }}>{q.correctAnswer}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #dee2e6' }}>
                      {q.imageUrl ? <img src={q.imageUrl} alt="Question" style={{ maxWidth: '100px', borderRadius: '4px' }} /> : 'None'}
                    </td>
                    <td style={{ padding: '0.75rem', border: '1px solid #dee2e6' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleEdit(q)} style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'background-color 0.3s ease'
                        }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(q._id)} style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'background-color 0.3s ease'
                        }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>
        {`
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default QuestionBankPage;