import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const TestTaking = () => {
  const { user } = useContext(AuthContext);
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Color scheme
  const colors = {
    armyGreen: '#4B5320',
    armyGreenLight: '#5D6B2A',
    armyGreenLighter: '#6F7D34',
    goldYellow: '#D4A017',
    goldYellowDark: '#B8860B',
    goldYellowLight: '#FFD700',
    background: '#F5F5F0',
    paper: '#FFFFF8',
    textDark: '#333333',
    textLight: '#555555',
    errorRed: '#B22222',
    successGreen: '#228B22',
    disabledGray: '#E0E0E0'
  };

  const fetchTest = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !user?._id) {
      setError('Please login again.');
      setLoading(false);
      navigate('/login');
      return;
    }
    try {
      console.log('TestTaking - Fetching test:', { testId, userId: user._id });
      const res = await fetch(`https://waec-gfv0.onrender.com/api/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load test');
      const validQuestions = (data.questions || []).filter(
        q => q && q._id && typeof q.text === 'string' && q.text.trim() && 
            Array.isArray(q.options) && q.options.length > 0 && 
            q.options.every(opt => typeof opt === 'string' && opt.trim())
      );
      console.log('TestTaking - Fetched test:', {
        testId,
        questions: validQuestions.map(q => ({ _id: q._id, text: q.text })),
        valid: validQuestions.length > 0
      });
      if (validQuestions.length === 0) {
        setError('No valid questions available for this test. Please contact your teacher.');
        setLoading(false);
        return;
      }
      setTest(data);
      setQuestions(validQuestions);
      setTimeLeft(data.duration * 60);
      setAnswers(validQuestions.reduce((acc, q) => ({ ...acc, [q._id]: '' }), {}));
      setLoading(false);
    } catch (err) {
      console.error('TestTaking - Fetch error:', err.message);
      setError(err.message);
      setLoading(false);
    }
  }, [testId, navigate, user?._id]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    const token = localStorage.getItem('token');
    try {
      console.log('TestTaking - Submitting test:', { testId, userId: user._id, answers });
      const res = await fetch(`https://waec-gfv0.onrender.com/api/tests/${testId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user._id, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit test');
      console.log('TestTaking - Submission success:', { testId });
      navigate('/student/submitted');
    } catch (err) {
      console.error('TestTaking - Submission error:', err.message);
      setError(err.message);
      setIsSubmitted(false);
    }
  }, [testId, user?._id, answers, navigate, isSubmitted]);

  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  useEffect(() => {
    if (timeLeft === null || isSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted, handleSubmit]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    console.log('TestTaking - Answer changed:', { questionId, value });
  };

  const handleQuestionSelect = (index) => {
    setCurrentQuestion(index);
    console.log('TestTaking - Selected question:', { index });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: `5px solid ${colors.goldYellow}`,
          borderTopColor: colors.armyGreen,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <p style={{
          color: colors.armyGreen,
          fontSize: '20px',
          fontWeight: '600',
        }}>Loading Test...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '30px',
        backgroundColor: '#FFF3F3',
        color: colors.errorRed,
        borderLeft: `4px solid ${colors.errorRed}`,
        margin: '20px auto',
        borderRadius: '6px',
        maxWidth: '800px',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          marginBottom: '16px',
          fontWeight: '600'
        }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: '10px' }}></i>
          Error Loading Test
        </h3>
        <p style={{ 
          fontSize: '16px', 
          marginBottom: '20px',
          lineHeight: '1.5'
        }}>{error}</p>
        <button
          onClick={() => navigate('/student/tests')}
          style={{
            padding: '10px 20px',
            backgroundColor: colors.goldYellow,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = colors.goldYellowDark)}
          onMouseOut={(e) => (e.target.style.backgroundColor = colors.goldYellow)}
          aria-label="Back to tests"
        >
          <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
          Back to Tests
        </button>
      </div>
    );
  }

  const progress = (Object.keys(answers).filter(id => answers[id] !== '').length / questions.length) * 100;

  return (
    <div style={{
      padding: '20px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      backgroundColor: colors.background,
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        backgroundColor: colors.paper,
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: `1px solid ${colors.armyGreen}20`
      }}>
        {/* Test Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          paddingBottom: '15px',
          borderBottom: `1px solid ${colors.armyGreen}20`
        }}>
          <div>
            <h2 style={{
              fontSize: '26px',
              fontWeight: '700',
              color: colors.armyGreen,
              marginBottom: '5px'
            }}>
              {test.title}
            </h2>
            <p style={{
              fontSize: '14px',
              color: colors.textLight,
              fontStyle: 'italic'
            }}>
              Exam ID: {testId.slice(0, 8).toUpperCase()}
            </p>
          </div>
          
          <div style={{
            backgroundColor: timeLeft <= 300 ? `${colors.errorRed}20` : `${colors.armyGreen}20`,
            padding: '10px 15px',
            borderRadius: '6px',
            border: `1px solid ${timeLeft <= 300 ? colors.errorRed : colors.armyGreen}30`,
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '12px',
              color: timeLeft <= 300 ? colors.errorRed : colors.textLight,
              marginBottom: '5px',
              fontWeight: '500'
            }}>TIME REMAINING</p>
            <p style={{
              fontSize: '20px',
              fontWeight: '700',
              color: timeLeft <= 300 ? colors.errorRed : colors.armyGreen
            }}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </p>
          </div>
        </div>

        {/* Progress and Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: '16px',
              color: colors.armyGreen,
              fontWeight: '600',
              marginBottom: '5px'
            }}>
              Question {currentQuestion + 1} of {questions.length}
            </p>
            <div style={{
              width: '100%',
              backgroundColor: colors.disabledGray,
              borderRadius: '4px',
              height: '10px',
              marginBottom: '5px'
            }}>
              <div style={{
                width: `${progress}%`,
                backgroundColor: colors.goldYellow,
                height: '10px',
                borderRadius: '4px',
                transition: 'width 0.3s ease-in-out',
                boxShadow: `0 2px 4px ${colors.goldYellow}40`
              }}></div>
            </div>
            <p style={{
              fontSize: '14px',
              color: colors.textLight,
              fontWeight: '500'
            }}>
              Progress: {Object.keys(answers).filter(id => answers[id] !== '').length}/{questions.length} answered
              ({Math.round(progress)}%)
            </p>
          </div>
        </div>

        {/* Question Navigation Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
          gap: '10px',
          marginBottom: '30px'
        }}>
          {questions.map((q, index) => (
            <button
              key={q._id}
              onClick={() => handleQuestionSelect(index)}
              disabled={isSubmitted}
              style={{
                padding: '8px 0',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                cursor: isSubmitted ? 'not-allowed' : 'pointer',
                backgroundColor:
                  index === currentQuestion ? colors.armyGreen :
                  answers[q._id] !== '' ? colors.successGreen : colors.disabledGray,
                color: index === currentQuestion || answers[q._id] !== '' ? '#FFFFFF' : colors.textDark,
                transition: 'all 0.2s',
                boxShadow: index === currentQuestion ? `0 2px 6px ${colors.armyGreen}80` : 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
              aria-label={`Go to question ${index + 1}`}
            >
              {index + 1}
              {index === currentQuestion && (
                <span style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  height: '3px',
                  backgroundColor: colors.goldYellow
                }}></span>
              )}
            </button>
          ))}
        </div>

        {/* Current Question */}
        {questions.length > 0 && (
          <div style={{
            padding: '25px',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            marginBottom: '30px',
            border: `1px solid ${colors.armyGreen}20`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '20px'
            }}>
              <div style={{
                backgroundColor: colors.armyGreen,
                color: '#FFFFFF',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '15px',
                flexShrink: '0',
                fontWeight: '700'
              }}>
                {currentQuestion + 1}
              </div>
              <p style={{
                fontSize: '18px',
                fontWeight: '500',
                color: colors.textDark,
                lineHeight: '1.5'
              }}>{questions[currentQuestion].text}</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '12px'
            }}>
              {questions[currentQuestion].options.map((opt, i) => (
                <label key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px',
                  backgroundColor: answers[questions[currentQuestion]._id] === opt ? `${colors.goldYellow}15` : '#FFFFFF',
                  border: `1px solid ${answers[questions[currentQuestion]._id] === opt ? colors.goldYellow : colors.disabledGray}`,
                  borderRadius: '6px',
                  cursor: isSubmitted ? 'not-allowed' : 'pointer',
                  color: colors.textDark,
                  transition: 'all 0.2s',
                  ':hover': {
                    borderColor: isSubmitted ? colors.disabledGray : colors.goldYellow
                  }
                }}>
                  <input
                    type="radio"
                    name={questions[currentQuestion]._id}
                    value={opt}
                    checked={answers[questions[currentQuestion]._id] === opt}
                    onChange={() => handleAnswerChange(questions[currentQuestion]._id, opt)}
                    disabled={isSubmitted}
                    style={{ 
                      marginRight: '15px',
                      width: '18px',
                      height: '18px',
                      accentColor: colors.goldYellow,
                      cursor: isSubmitted ? 'not-allowed' : 'pointer'
                    }}
                  />
                  <span style={{
                    fontSize: '16px',
                    fontWeight: answers[questions[currentQuestion]._id] === opt ? '500' : '400'
                  }}>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '15px',
          paddingTop: '20px',
          borderTop: `1px solid ${colors.armyGreen}20`
        }}>
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0 || isSubmitted}
            style={{
              padding: '12px 25px',
              backgroundColor: currentQuestion === 0 || isSubmitted ? colors.disabledGray : colors.armyGreen,
              color: currentQuestion === 0 || isSubmitted ? colors.textLight : '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              cursor: currentQuestion === 0 || isSubmitted ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              if (currentQuestion !== 0 && !isSubmitted) {
                e.target.style.backgroundColor = colors.armyGreenLight;
              }
            }}
            onMouseOut={(e) => {
              if (currentQuestion !== 0 && !isSubmitted) {
                e.target.style.backgroundColor = colors.armyGreen;
              }
            }}
            aria-label="Previous question"
          >
            <i className="fas fa-chevron-left" style={{ marginRight: '8px' }}></i>
            Previous
          </button>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={handleNext}
              disabled={currentQuestion === questions.length - 1 || isSubmitted}
              style={{
                padding: '12px 25px',
                backgroundColor: currentQuestion === questions.length - 1 || isSubmitted ? colors.disabledGray : colors.armyGreen,
                color: currentQuestion === questions.length - 1 || isSubmitted ? colors.textLight : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: currentQuestion === questions.length - 1 || isSubmitted ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => {
                if (currentQuestion !== questions.length - 1 && !isSubmitted) {
                  e.target.style.backgroundColor = colors.armyGreenLight;
                }
              }}
              onMouseOut={(e) => {
                if (currentQuestion !== questions.length - 1 && !isSubmitted) {
                  e.target.style.backgroundColor = colors.armyGreen;
                }
              }}
              aria-label="Next question"
            >
              Next
              <i className="fas fa-chevron-right" style={{ marginLeft: '8px' }}></i>
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitted || Object.keys(answers).filter(id => answers[id] !== '').length < questions.length}
              style={{
                padding: '12px 25px',
                backgroundColor: isSubmitted || Object.keys(answers).filter(id => answers[id] !== '').length < questions.length ? colors.disabledGray : colors.goldYellow,
                color: isSubmitted || Object.keys(answers).filter(id => answers[id] !== '').length < questions.length ? colors.textLight : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: isSubmitted || Object.keys(answers).filter(id => answers[id] !== '').length < questions.length ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => {
                if (!isSubmitted && Object.keys(answers).filter(id => answers[id] !== '').length >= questions.length) {
                  e.target.style.backgroundColor = colors.goldYellowDark;
                }
              }}
              onMouseOut={(e) => {
                if (!isSubmitted && Object.keys(answers).filter(id => answers[id] !== '').length >= questions.length) {
                  e.target.style.backgroundColor = colors.goldYellow;
                }
              }}
              aria-label="Submit test"
            >
              <i className="fas fa-paper-plane" style={{ marginRight: '8px' }}></i>
              {isSubmitted ? 'Submitted' : 'Submit Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestTaking;