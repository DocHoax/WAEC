import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useTeacherData from '../../hooks/useTeacherData';
import axios from 'axios';
import { addStyles, EditableMathField } from 'react-mathquill';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { FiSave, FiX, FiAlertTriangle, FiCheckCircle, FiHelpCircle, FiPlus, FiMinus } from 'react-icons/fi';

// Load MathQuill styles
addStyles();

const AddQuestion = () => {
  const { user, questions, fetchQuestions, error, success, setError, setSuccess } = useTeacherData();
  const { testId } = useParams();
  const navigate = useNavigate();
  const [questionForms, setQuestionForms] = useState([
    {
      subject: '',
      class: '',
      text: [],
      options: ['', '', '', ''],
      correctAnswer: '',
      marks: 1,
      saveToBank: true,
      formula: '',
    },
  ]);
  const [editQuestionId, setEditQuestionId] = useState(null);
  const [showQuestionPreview, setShowQuestionPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMathEditor, setShowMathEditor] = useState(null);
  const [mathInput, setMathInput] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);
  const editorRefs = useRef([]);
  const topicInputRef = useRef(null);

  const mathSymbols = [
    { label: 'Fraction', latex: '\\frac{a}{b}', display: '\\frac{a}{b}' },
    { label: 'Square Root', latex: '\\sqrt{x}', display: '\\sqrt{x}' },
    { label: 'Power', latex: 'x^{2}', display: 'x^{2}' },
    { label: 'Pi', latex: '\\pi', display: '\\pi' },
    { label: 'Sum', latex: '\\sum_{i=0}^{n}', display: '\\sum_{i=0}^{n}' },
    { label: 'Integral', latex: '\\int_{a}^{b}', display: '\\int_{a}^{b}' },
    { label: 'Alpha', latex: '\\alpha', display: '\\alpha' },
    { label: 'Beta', latex: '\\beta', display: '\\beta' },
    { label: 'Gamma', latex: '\\gamma', display: '\\gamma' },
    { label: 'Viscosity (Stokes)', latex: 'F = 6\\pi \\eta r v', display: 'F = 6\\pi \\eta r v', topic: 'viscosity' },
    { label: 'Newton\'s 2nd Law', latex: 'F = m a', display: 'F = m a', topic: 'mechanics' },
    { label: 'Kinetic Energy', latex: 'E_k = \\frac{1}{2} m v^2', display: 'E_k = \\frac{1}{2} m v^2', topic: 'mechanics' },
    { label: 'Gravitational Force', latex: 'F = G \\frac{m_1 m_2}{r^2}', display: 'F = G \\frac{m_1 m_2}{r^2}', topic: 'gravitation' },
    { label: 'Hooke\'s Law', latex: 'F = -k x', display: 'F = -k x', topic: 'mechanics' },
    { label: 'Ideal Gas Law', latex: 'PV = nRT', display: 'PV = nRT', topic: 'thermodynamics' },
    { label: 'Ohm\'s Law', latex: 'V = IR', display: 'V = IR', topic: 'electricity' },
    { label: 'Wave Speed', latex: 'v = f \\lambda', display: 'v = f \\lambda', topic: 'waves' },
    { label: 'Momentum', latex: 'p = m v', display: 'p = m v', topic: 'mechanics' },
    { label: 'Work Done', latex: 'W = F s \\cos\\theta', display: 'W = F s \\cos\\theta', topic: 'mechanics' },
    { label: 'Planck\'s Equation', latex: 'E = h f', display: 'E = h f', topic: 'quantum' },
  ];

  const helpContent = [
    { label: 'Fraction', input: '\\frac{a}{b}', display: '\\frac{a}{b}' },
    { label: 'Square Root', input: '\\sqrt{x}', display: '\\sqrt{x}' },
    { label: 'Power', input: 'x^2', display: 'x^{2}' },
    { label: 'Pi', input: '\\pi', display: '\\pi' },
    { label: 'Integral', input: '\\int_{a}^{b}', display: '\\int_{a}^{b}' },
    { label: 'Viscosity', input: 'F = 6\\pi \\eta r v', display: 'F = 6\\pi \\eta r v' },
  ];

  const shortcuts = [
    { key: 'Ctrl + M', description: 'Open math editor' },
    { key: 'Enter', description: 'Insert formula' },
    { key: 'Escape', description: 'Close math editor' },
    { key: 'Ctrl + T', description: 'Focus topic input' },
  ];

  const getTopicSuggestions = () => {
    if (!topicInput.trim()) return [];
    const lowercaseInput = topicInput.toLowerCase();
    return mathSymbols.filter(symbol =>
      symbol.topic?.toLowerCase().includes(lowercaseInput) ||
      symbol.label.toLowerCase().includes(lowercaseInput)
    );
  };

  useEffect(() => {
    const state = window.history.state?.state;
    if (state?.editQuestionId && state?.questionForm) {
      setEditQuestionId(state.editQuestionId);
      let textContent = [];
      if (state.questionForm.text) {
        textContent.push({ type: 'text', value: state.questionForm.text });
      }
      if (state.questionForm.formula) {
        const formulas = state.questionForm.formula.split(';').filter(f => f);
        formulas.forEach(formula => {
          textContent.push({ type: 'latex', value: formula });
        });
      }
      setQuestionForms([{
        ...state.questionForm,
        text: textContent,
        saveToBank: state.questionForm.saveToBank ?? true,
        formula: state.questionForm.formula || '',
      }]);
      if (editorRefs.current[0]) {
        renderContentToEditor(textContent, 0);
      }
    }
  }, []);

  const renderContentToEditor = (content, index) => {
    if (editorRefs.current[index]) {
      editorRefs.current[index].innerHTML = '';
      content.forEach(item => {
        if (item.type === 'text') {
          const textNode = document.createTextNode(item.value);
          editorRefs.current[index].appendChild(textNode);
        } else if (item.type === 'latex') {
          const span = document.createElement('span');
          span.className = 'math-formula';
          span.dataset.latex = item.value;
          span.innerHTML = katex.renderToString(item.value, { throwOnError: false });
          span.onclick = () => {
            setMathInput(item.value);
            setShowMathEditor(index);
          };
          editorRefs.current[index].appendChild(span);
        }
      });
    }
  };

  const handleEditorInput = (index) => {
    if (editorRefs.current[index]) {
      const nodes = Array.from(editorRefs.current[index].childNodes);
      const newContent = nodes.map(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          return { type: 'text', value: node.textContent };
        } else if (node.nodeType === Node.ELEMENT_NODE && node.dataset.latex) {
          return { type: 'latex', value: node.dataset.latex };
        }
        return null;
      }).filter(item => item && item.value.trim());
      const newQuestionForms = [...questionForms];
      newQuestionForms[index].text = newContent;
      setQuestionForms(newQuestionForms);
    }
  };

  const insertLatex = (latex, index) => {
    if (!editorRefs.current[index] || !latex) return;

    const selection = window.getSelection();
    let range;
    if (selection.rangeCount && editorRefs.current[index].contains(selection.anchorNode)) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editorRefs.current[index]);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const span = document.createElement('span');
    span.className = 'math-formula';
    span.dataset.latex = latex;
    span.innerHTML = katex.renderToString(latex, { throwOnError: false });
    span.onclick = () => {
      setMathInput(latex);
      setShowMathEditor(index);
    };

    range.deleteContents();
    range.insertNode(span);
    range.setStartAfter(span);
    range.setEndAfter(span);
    selection.removeAllRanges();
    selection.addRange(range);

    handleEditorInput(index);
    setShowMathEditor(null);
    setMathInput('');
    setTopicInput('');
    setShowTopicSuggestions(false);
    editorRefs.current[index].focus();
  };

  const handleMathInput = (mathField) => {
    setMathInput(mathField.latex());
  };

  const handleKeyDown = (e, index) => {
    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault();
      setShowMathEditor(index);
      setMathInput('');
    } else if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      topicInputRef.current?.focus();
    }
    if (showMathEditor === index) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (mathInput) insertLatex(mathInput, index);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMathEditor(null);
        setMathInput('');
      }
    }
  };

  const isQuestionValid = (form) => {
    const textString = form.text.map(item => item.value).join(' ').trim();
    return (
      form.subject &&
      form.class &&
      textString &&
      form.options.every(opt => opt.trim()) &&
      form.options.length === 4 &&
      form.correctAnswer &&
      form.options.includes(form.correctAnswer) &&
      form.marks > 0 &&
      user.subjects.some(sub => sub.subject === form.subject && sub.class === form.class)
    );
  };

  const addNewQuestionForm = () => {
    if (questionForms.length >= 10) {
      setError('Maximum 10 questions allowed at once.');
      return;
    }
    setQuestionForms([
      ...questionForms,
      {
        subject: '',
        class: '',
        text: [],
        options: ['', '', '', ''],
        correctAnswer: '',
        marks: 1,
        saveToBank: true,
        formula: '',
      },
    ]);
    editorRefs.current.push(null);
  };

  const removeQuestionForm = (index) => {
    if (questionForms.length === 1) {
      setError('At least one question form is required.');
      return;
    }
    const newQuestionForms = questionForms.filter((_, i) => i !== index);
    setQuestionForms(newQuestionForms);
    editorRefs.current = editorRefs.current.filter((_, i) => i !== index);
    if (showQuestionPreview === index) setShowQuestionPreview(null);
    if (showMathEditor === index) setShowMathEditor(null);
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    const validQuestions = questionForms.filter(isQuestionValid);
    if (validQuestions.length === 0) {
      setError('No valid questions to submit. Ensure all fields are filled correctly, including 4 non-empty options, a matching correct answer, and valid subject/class.');
      return;
    }
    if (validQuestions.length < questionForms.length) {
      setError('Some questions are invalid and will be skipped. Check subject, class, options, and correct answer.');
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');

      const questionsData = validQuestions.map(form => ({
        subject: form.subject,
        class: form.class,
        text: form.text.map(item => item.value).join(' ').trim(),
        options: form.options,
        correctAnswer: form.correctAnswer,
        marks: form.marks,
        saveToBank: form.saveToBank,
        formula: form.text.some(item => item.type === 'latex') ? form.text.filter(item => item.type === 'latex').map(item => item.value).join(';') : '',
        ...(testId && testId !== 'undefined' && { testId }),
      }));

      console.log('Submitting questions:', JSON.stringify(questionsData, null, 2));

      let res;
      if (editQuestionId) {
        const formData = new FormData();
        Object.entries(questionsData[0]).forEach(([key, value]) => {
          formData.append(key, key === 'options' ? JSON.stringify(value) : value);
        });
        res = await axios.put(`http://localhost:5000/api/questions/${editQuestionId}`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
        setSuccess('Question updated.');
      } else {
        res = await axios.post('http://localhost:5000/api/questions/bulk', { questions: questionsData }, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const { message, count, invalidQuestions } = res.data;
        setSuccess(`${message}${invalidQuestions?.length > 0 ? ` (${invalidQuestions.map(i => `Question ${i.index}: ${i.error}`).join(', ')})` : ''}`);
      }

      setQuestionForms([{
        subject: '',
        class: '',
        text: [],
        options: ['', '', '', ''],
        correctAnswer: '',
        marks: 1,
        saveToBank: true,
        formula: '',
      }]);
      setShowQuestionPreview(null);
      setEditQuestionId(null);
      fetchQuestions();
      editorRefs.current = [null];
      navigate(testId && testId !== 'undefined' ? `/teacher/test-creation/${testId}/questions` : '/teacher/questions');
    } catch (err) {
      console.error('AddQuestion - Error:', { message: err.message, response: err.response?.data });
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else if (err.response?.data?.invalidQuestions) {
        setError(`Failed to save some questions: ${err.response.data.invalidQuestions.map(i => `Question ${i.index}: ${i.error}`).join(', ')}`);
      } else {
        setError(err.response?.data?.error || 'Failed to process questions.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewQuestion = (index) => {
    if (!isQuestionValid(questionForms[index])) {
      setError('Fill all fields for this question to preview, including 4 non-empty options and a matching correct answer.');
      return;
    }
    setShowQuestionPreview(index);
  };

  const renderPreviewContent = (form) => {
    return form.text.map((item, index) => {
      if (item.type === 'text') {
        return <span key={index}>{item.value}</span>;
      } else if (item.type === 'latex') {
        return (
          <span
            key={index}
            className="math-formula"
            dangerouslySetInnerHTML={{ __html: katex.renderToString(item.value, { throwOnError: false }) }}
          />
        );
      }
      return null;
    });
  };

  if (!user || user.role !== 'teacher') {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#4B5320' }}>
        <p>Access denied. Please log in as a teacher.</p>
      </div>
    );
  }

  const subjectOptions = [...new Set(user.subjects?.map(s => s.subject) || [])];
  const classOptions = [...new Set(user.subjects?.map(s => s.class) || [])];

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <script src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js" id="MathJax-script"></script>
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
          <FiAlertTriangle style={{ marginRight: '10px', fontSize: '20px' }} />
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
          <FiCheckCircle style={{ marginRight: '10px', fontSize: '20px' }} />
          <span>{success}</span>
        </div>
      )}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '25px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        marginBottom: '30px'
      }}>
        <h2 style={{
          color: '#4B5320',
          marginTop: '0',
          marginBottom: '20px',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <FiPlus style={{ marginRight: '10px' }} />
          {editQuestionId ? 'Edit Question' : 'Add Questions'}
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <button
            onClick={() => setShowHelp(!showHelp)}
            style={{
              backgroundColor: '#FFD700',
              color: '#4B5320',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <FiHelpCircle style={{ marginRight: '5px' }} />
            {showHelp ? 'Hide Help' : 'Show Help'}
          </button>
          {!editQuestionId && (
            <button
              onClick={addNewQuestionForm}
              disabled={questionForms.length >= 10}
              style={{
                backgroundColor: questionForms.length >= 10 ? '#ccc' : '#4B5320',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: questionForms.length >= 10 ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <FiPlus style={{ marginRight: '5px' }} />
              Add Another Question
            </button>
          )}
        </div>
        {showHelp && (
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <h4 style={{ color: '#4B5320', marginTop: '0' }}>Math Input Help</h4>
            <p>Use the following shortcuts:</p>
            <ul style={{ listStyle: 'none', padding: '0' }}>
              {shortcuts.map((shortcut, index) => (
                <li key={index} style={{ marginBottom: '8px', color: '#4B5320' }}>
                  <strong>{shortcut.key}</strong>: {shortcut.description}
                </li>
              ))}
            </ul>
            <p>Supported LaTeX commands:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {helpContent.map((item, index) => (
                <div key={index} style={{ flex: '1 0 45%', marginBottom: '10px' }}>
                  <strong>{item.label}</strong>: <code>{item.input}</code>
                  <div dangerouslySetInnerHTML={{ __html: katex.renderToString(item.display, { throwOnError: false }) }} />
                </div>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleQuestionSubmit}>
          {questionForms.map((form, index) => (
            <div key={index} style={{
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '15px',
              marginBottom: '20px',
              backgroundColor: '#fafafa'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: '#4B5320', margin: '0' }}>Question {index + 1}</h3>
                {!editQuestionId && questionForms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestionForm(index)}
                    style={{
                      backgroundColor: '#ff6b6b',
                      color: 'white',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    <FiMinus style={{ marginRight: '5px' }} />
                    Remove
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#4B5320', fontWeight: '600' }}>
                    Subject
                  </label>
                  <select
                    value={form.subject}
                    onChange={(e) => {
                      const newQuestionForms = [...questionForms];
                      newQuestionForms[index].subject = e.target.value;
                      setQuestionForms(newQuestionForms);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: 'white'
                    }}
                    disabled={editQuestionId}
                  >
                    <option value="">Select Subject</option>
                    {subjectOptions.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#4B5320', fontWeight: '600' }}>
                    Class
                  </label>
                  <select
                    value={form.class}
                    onChange={(e) => {
                      const newQuestionForms = [...questionForms];
                      newQuestionForms[index].class = e.target.value;
                      setQuestionForms(newQuestionForms);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: 'white'
                    }}
                    disabled={editQuestionId}
                  >
                    <option value="">Select Class</option>
                    {classOptions.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#4B5320', fontWeight: '600' }}>
                  Question Text
                </label>
                <div
                  ref={el => editorRefs.current[index] = el}
                  contentEditable
                  onInput={() => handleEditorInput(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '10px',
                    minHeight: '100px',
                    backgroundColor: 'white',
                    outline: 'none'
                  }}
                />
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMathEditor(index);
                      setMathInput('');
                    }}
                    style={{
                      backgroundColor: '#4B5320',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Add Formula (Ctrl+M)
                  </button>
                  <input
                    ref={topicInputRef}
                    type="text"
                    value={topicInput}
                    onChange={(e) => {
                      setTopicInput(e.target.value);
                      setShowTopicSuggestions(true);
                    }}
                    placeholder="Search formulas by topic (Ctrl+T)"
                    style={{
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      flex: '1'
                    }}
                  />
                </div>
                {showTopicSuggestions && getTopicSuggestions().length > 0 && (
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '10px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                  }}>
                    {getTopicSuggestions().map((symbol, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '8px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                        onClick={() => {
                          setMathInput(symbol.latex);
                          setShowMathEditor(index);
                          setTopicInput('');
                          setShowTopicSuggestions(false);
                        }}
                      >
                        <span dangerouslySetInnerHTML={{ __html: katex.renderToString(symbol.display, { throwOnError: false }) }} />
                        <span>{symbol.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {showMathEditor === index && (
                <div style={{
                  backgroundColor: '#f5f5f5',
                  padding: '15px',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <EditableMathField
                    latex={mathInput}
                    onChange={handleMathInput}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => insertLatex(mathInput, index)}
                      style={{
                        backgroundColor: '#4B5320',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Insert Formula (Enter)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMathEditor(null);
                        setMathInput('');
                      }}
                      style={{
                        backgroundColor: '#ff6b6b',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Cancel (Esc)
                    </button>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#4B5320', fontWeight: '600' }}>
                  Options
                </label>
                {form.options.map((option, optIndex) => (
                  <div key={optIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newQuestionForms = [...questionForms];
                        newQuestionForms[index].options[optIndex] = e.target.value.trim();
                        if (newQuestionForms[index].correctAnswer === option) {
                          newQuestionForms[index].correctAnswer = e.target.value.trim();
                        }
                        setQuestionForms(newQuestionForms);
                      }}
                      placeholder={`Option ${optIndex + 1}`}
                      style={{
                        flex: '1',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        marginRight: '10px'
                      }}
                    />
                    <input
                      type="radio"
                      name={`correctAnswer-${index}`}
                      value={option}
                      checked={form.correctAnswer === option}
                      onChange={(e) => {
                        const newQuestionForms = [...questionForms];
                        newQuestionForms[index].correctAnswer = e.target.value;
                        setQuestionForms(newQuestionForms);
                      }}
                      disabled={!option.trim()}
                      style={{ marginRight: '10px' }}
                    />
                    <label>Correct</label>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#4B5320', fontWeight: '600' }}>
                  Marks
                </label>
                <input
                  type="number"
                  value={form.marks}
                  onChange={(e) => {
                    const newQuestionForms = [...questionForms];
                    newQuestionForms[index].marks = parseInt(e.target.value) || 1;
                    setQuestionForms(newQuestionForms);
                  }}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', color: '#4B5320', fontWeight: '600' }}>
                  <input
                    type="checkbox"
                    checked={form.saveToBank}
                    onChange={(e) => {
                      const newQuestionForms = [...questionForms];
                      newQuestionForms[index].saveToBank = e.target.checked;
                      setQuestionForms(newQuestionForms);
                    }}
                    style={{ marginRight: '10px' }}
                  />
                  Save to Question Bank
                </label>
              </div>
              <button
                type="button"
                onClick={() => handlePreviewQuestion(index)}
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#ccc' : '#FFD700',
                  color: '#4B5320',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}
              >
                Preview Question {index + 1}
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: loading ? '#ccc' : '#4B5320',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <FiSave style={{ marginRight: '8px' }} />
              {editQuestionId ? 'Update Question' : 'Save All Questions'}
            </button>
            <button
              type="button"
              onClick={() => navigate(testId && testId !== 'undefined' ? `/teacher/test-creation/${testId}/questions` : '/teacher/questions')}
              style={{
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <FiX style={{ marginRight: '8px' }} />
              Cancel
            </button>
          </div>
        </form>
      </div>
      {showQuestionPreview !== null && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '25px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#4B5320', marginTop: '0' }}>Question {showQuestionPreview + 1} Preview</h3>
          <p>{renderPreviewContent(questionForms[showQuestionPreview])}</p>
          <ul style={{ listStyle: 'none', padding: '0' }}>
            {questionForms[showQuestionPreview].options.map((option, index) => (
              <li key={index} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                <input
                  type="radio"
                  checked={questionForms[showQuestionPreview].correctAnswer === option}
                  readOnly
                  style={{ marginRight: '10px' }}
                />
                <span>{option}</span>
              </li>
            ))}
          </ul>
          <p><strong>Marks:</strong> {questionForms[showQuestionPreview].marks}</p>
          <button
            onClick={() => setShowQuestionPreview(null)}
            style={{
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Close Preview
          </button>
        </div>
      )}
    </div>
  );
};

export default AddQuestion;