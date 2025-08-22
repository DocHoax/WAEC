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
    return <p>Access restricted to teachers.</p>;
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
      await axios.post(`http://localhost:5000/api/questions/${testId}`, data, {
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
    <div>
      <h2>Add Question {questionCount + 1}/40 for Test</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Subject:</label>
          <select name="subject" value={formData.subject} onChange={handleChange} required disabled>
            {user.subjects.map((sub, index) => (
              <option key={index} value={sub.subject}>{sub.subject}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Class:</label>
          <select name="class" value={formData.class} onChange={handleChange} required disabled>
            {user.subjects.map((sub, index) => (
              <option key={index} value={sub.class}>{sub.class}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Category (e.g., Algebra):</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="Algebra"
          />
        </div>
        <div>
          <label>Question Type:</label>
          <select name="type" value={formData.type} onChange={handleChange} required>
            <option value="multiple-choice">Multiple Choice</option>
            <option value="true-false">True/False</option>
          </select>
        </div>
        <div>
          <label>Question Text:</label>
          <textarea name="text" value={formData.text} onChange={handleChange} required />
        </div>
        <div>
          <label>Options:</label>
          {formData.options.map((option, index) => (
            <div key={index}>
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                required
              />
            </div>
          ))}
        </div>
        <div>
          <label>Correct Answer:</label>
          <input
            type="text"
            name="correctAnswer"
            value={formData.correctAnswer}
            onChange={handleChange}
            required
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
        <button type="submit">Add Question</button>
        <button type="button" onClick={() => navigate('/teacher')}>Finish</button>
      </form>
    </div>
  );
};

export default QuestionCreation;