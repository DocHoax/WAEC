import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const QuestionForm = ({ onSuccess }) => {
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    subject: '',
    class: '',
    topic: '',
    difficulty: 'medium',
    type: 'multiple-choice',
    text: '',
    image: '',
    options: ['', '', '', ''],
    correctAnswer: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/questions', formData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      onSuccess();
      setFormData({
        subject: '',
        class: '',
        topic: '',
        difficulty: 'medium',
        type: 'multiple-choice',
        text: '',
        image: '',
        options: ['', '', '', ''],
        correctAnswer: ''
      });
    } catch (err) {
      setError('Error creating question');
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Create Question</h5>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Subject</label>
            <select
              className="form-control"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
            >
              <option value="">Select Subject</option>
              {user.subjects.map((s, i) => (
                <option key={i} value={s.subject}>{s.subject} ({s.class})</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Class</label>
            <input
              type="text"
              className="form-control"
              name="class"
              value={formData.class}
              onChange={handleInputChange}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Topic</label>
            <input
              type="text"
              className="form-control"
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Difficulty</label>
            <select
              className="form-control"
              name="difficulty"
              value={formData.difficulty}
              onChange={handleInputChange}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Type</label>
            <select
              className="form-control"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
            >
              <option value="multiple-choice">Multiple Choice</option>
              <option value="true-false">True/False</option>
              <option value="fill-in-the-blank">Fill in the Blank</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Question Text (or LaTeX)</label>
            <textarea
              className="form-control"
              name="text"
              value={formData.text}
              onChange={handleInputChange}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Image URL (optional)</label>
            <input
              type="text"
              className="form-control"
              name="image"
              value={formData.image}
              onChange={handleInputChange}
            />
          </div>
          {formData.type === 'multiple-choice' && (
            <div className="mb-3">
              <label className="form-label">Options</label>
              {formData.options.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  className="form-control mb-2"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                />
              ))}
            </div>
          )}
          <div className="mb-3">
            <label className="form-label">Correct Answer</label>
            <input
              type="text"
              className="form-control"
              name="correctAnswer"
              value={formData.correctAnswer}
              onChange={handleInputChange}
            />
          </div>
          {error && <p className="text-danger">{error}</p>}
          <button type="submit" className="btn btn-primary">Save Question</button>
        </form>
      </div>
    </div>
  );
};

export default QuestionForm;