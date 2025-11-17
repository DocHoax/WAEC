import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const QuestionCreation = () => {
  const { user } = useContext(AuthContext);
  const { testId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    subject: user?.subjects[0]?.subject || 'Maths',
    class: user?.subjects[0]?.class || 'SS1',
    category: '',
    type: 'multiple-choice',
    text: '',
    options: ['', '', '', ''], // Default 4 options for multiple-choice
    correctAnswer: '',
    image: null
  });
  const [questionCount, setQuestionCount] = useState(0);

  if (!user || user.role !== 'teacher') {
    return (
      <div style={{
        backgroundColor: '#b8c2cc',
        fontFamily: '"Fredoka", sans-serif',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <p>Access restricted to teachers.</p>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'type') {
      setFormData({
        ...formData,
        type: value,
        options: value === 'multiple-choice' ? ['', '', '', ''] : ['True', 'False']
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleImageChange = (e) => {
    setFormData({ ...formData, image: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (questionCount >= 40) {
      alert('Maximum 40 questions reached.');
      navigate('/teacher');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login again.');
      navigate('/login');
      return;
    }

    const data = new FormData();
    data.append('subject', formData.subject);
    data.append('class', formData.class);
    data.append('category', formData.category);
    data.append('type', formData.type);
    data.append('text', formData.text);
    data.append('options', JSON.stringify(formData.options));
    data.append('correctAnswer', formData.correctAnswer);
    if (formData.image) data.append('image', formData.image);

    console.log('QuestionCreation - Submitting:', Object.fromEntries(data));
    try {
      await axios.post(`https://waec-gfv0.onrender.com/api/questions/${testId}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('Question added!');
      setQuestionCount(questionCount + 1);
      setFormData({
        subject: formData.subject,
        class: formData.class,
        category: '',
        type: 'multiple-choice',
        text: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        image: null
      });
      document.getElementById('image-input').value = ''; // Reset file input
      if (questionCount + 1 >= 40) {
        navigate('/teacher');
      }
    } catch (error) {
      console.error('QuestionCreation - Error:', error.response?.data);
      alert('Failed to add question: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  return (
    <div style={{
      backgroundColor: '#b8c2cc',
      fontFamily: '"Fredoka", sans-serif',
      minHeight: '100vh',
      padding: '20px',
      animation: 'fadeIn 0.6s ease-out'
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '800px',
        margin: '0 auto',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-5px)';
        e.target.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      }}>
        <h2 style={{ color: '#4B5320', marginBottom: '1rem' }}>Add Question {questionCount + 1}/40 for Test</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label>Subject:</label>
              <select name="subject" value={formData.subject} onChange={handleChange} required disabled
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                {user.subjects.map((sub, index) => (
                  <option key={index} value={sub.subject}>{sub.subject}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Class:</label>
              <select name="class" value={formData.class} onChange={handleChange} required disabled
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                {user.subjects.map((sub, index) => (
                  <option key={index} value={sub.class}>{sub.class}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label>Category (e.g., Algebra):</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="Algebra"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          
          <div>
            <label>Question Type:</label>
            <select name="type" value={formData.type} onChange={handleChange} required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="multiple-choice">Multiple Choice</option>
              <option value="true-false">True/False</option>
            </select>
          </div>
          
          <div>
            <label>Question Text:</label>
            <textarea name="text" value={formData.text} onChange={handleChange} required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' }} />
          </div>
          
          <div>
            <label>Options:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {formData.options.map((option, index) => (
                <div key={index}>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    required
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <label>Correct Answer:</label>
            <input
              type="text"
              name="correctAnswer"
              value={formData.correctAnswer}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          
          <div>
            <label>Image (optional):</label>
            <input
              type="file"
              id="image-input"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#4B7043',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease, transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#3a5934';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#4B7043';
              e.target.style.transform = 'scale(1)';
            }}>
              Add Question
            </button>
            <button type="button" onClick={() => navigate('/teacher')} style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease, transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#545b62';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#6c757d';
              e.target.style.transform = 'scale(1)';
            }}>
              Finish
            </button>
          </div>
        </form>
      </div>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

export default QuestionCreation;