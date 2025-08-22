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
        const res = await axios.get('http://localhost:5000/api/questions', {
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
        await axios.put(`http://localhost:5000/api/questions/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
        console.log('QuestionBank - Update success');
      } else {
        console.log('QuestionBank - Creating question');
        await axios.post('http://localhost:5000/api/questions', formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
        console.log('QuestionBank - Create success');
      }
      setForm({ subject: '', class: '', text: '', options: ['', '', '', ''], correctAnswer: '', image: null });
      setEditingId(null);
      setPreviewImage(null);
      const res = await axios.get('http://localhost:5000/api/questions', {
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
      await axios.delete(`http://localhost:5000/api/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('QuestionBank - Delete success');
      setQuestions(questions.filter((q) => q._id !== id));
    } catch (err) {
      console.error('QuestionBank - Delete error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to delete question.');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!user || user.role !== 'teacher') return <p>Access restricted to teachers.</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Question Bank</h2>
      <h3>{editingId ? 'Edit Question' : 'Add New Question'}</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Subject:</label>
          <input
            type="text"
            name="subject"
            value={form.subject}
            onChange={handleInputChange}
            required
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
          />
        </div>
        <div>
          <label>Question Text:</label>
          <textarea
            name="text"
            value={form.text}
            onChange={handleInputChange}
            required
          />
          <p>{form.text || ''}</p>
        </div>
        <div>
          <label>Options:</label>
          {form.options.map((option, index) => (
            <input
              key={index}
              type="text"
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              required
            />
          ))}
        </div>
        <div>
          <label>Correct Answer:</label>
          <select
            name="correctAnswer"
            value={form.correctAnswer}
            onChange={handleInputChange}
            required
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
          {previewImage && <img src={previewImage} alt="Preview" style={{ maxWidth: '200px' }} />}
        </div>
        <button type="submit">{editingId ? 'Update Question' : 'Add Question'}</button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setForm({ subject: '', class: '', text: '', options: ['', '', '', ''], correctAnswer: '', image: null });
              setEditingId(null);
              setPreviewImage(null);
            }}
          >
            Cancel Edit
          </button>
        )}
      </form>

      <h3>Existing Questions</h3>
      {questions.length === 0 ? (
        <p>No questions available.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Class</th>
              <th>Question</th>
              <th>Options</th>
              <th>Correct Answer</th>
              <th>Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q._id}>
                <td>{q.subject}</td>
                <td>{q.class}</td>
                <td>{q.text || ''}</td>
                <td>{q.options.join(', ')}</td>
                <td>{q.correctAnswer}</td>
                <td>{q.imageUrl ? <img src={q.imageUrl} alt="Question" style={{ maxWidth: '100px' }} /> : 'None'}</td>
                <td>
                  <button onClick={() => handleEdit(q)}>Edit</button>
                  <button onClick={() => handleDelete(q._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default QuestionBankPage;