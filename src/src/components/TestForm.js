import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const TestForm = () => {
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    subject: user.subjects[0]?.subject || '',
    class: user.subjects[0]?.class || '',
    topic: '',
    difficulty: 'medium',
    type: 'multiple-choice',
    text: '',
    image: '',
    options: ['', '', '', ''],
    correctAnswer: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting:', formData);
    try {
      await axios.post('http://localhost:5000/api/questions', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Question created!');
      setFormData({
        subject: user.subjects[0]?.subject || '',
        class: user.subjects[0]?.class || '',
        topic: '',
        difficulty: 'medium',
        type: 'multiple-choice',
        text: '',
        image: '',
        options: ['', '', '', ''],
        correctAnswer: ''
      });
    } catch (error) {
      console.error('Error creating question:', error.response?.data);
      alert('Failed to create question: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Subject:</label>
        <select name="subject" value={formData.subject} onChange={handleChange} required>
          {user.subjects.map((sub, index) => (
            <option key={index} value={sub.subject}>{sub.subject}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Class:</label>
        <select name="class" value={formData.class} onChange={handleChange} required>
          {user.subjects.map((sub, index) => (
            <option key={index} value={sub.class}>{sub.class}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Topic:</label>
        <input type="text" name="topic" value={formData.topic} onChange={handleChange} required />
      </div>
      <div>
        <label>Difficulty:</label>
        <select name="difficulty" value={formData.difficulty} onChange={handleChange}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <div>
        <label>Type:</label>
        <select name="type" value={formData.type} onChange={handleChange}>
          <option value="multiple-choice">Multiple Choice</option>
          <option value="true-false">True/False</option>
        </select>
      </div>
      <div>
        <label>Question Text:</label>
        <textarea name="text" value={formData.text} onChange={handleChange} required />
      </div>
      <div>
        <label>Image URL (optional):</label>
        <input type="text" name="image" value={formData.image} onChange={handleChange} />
      </div>
      {formData.type === 'multiple-choice' && (
        <>
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
        </>
      )}
      <div>
        <label>Correct Answer:</label>
        <input type="text" name="correctAnswer" value={formData.correctAnswer} onChange={handleChange} required />
      </div>
      <button type="submit">Create Question</button>
    </form>
  );
};

export default TestForm;