const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Test = require('../models/Test');
const { auth, teacherOnly } = require('../middleware/auth');
const mongoose = require('mongoose');

// Get all questions
router.get('/', auth, teacherOnly, async (req, res) => {
  try {
    const { subject, class: className, tags } = req.query;
    const query = {
      $or: req.user.subjects.map(sub => ({ subject: sub.subject, class: sub.class })),
    };
    if (subject) query.subject = subject;
    if (className) query.class = className;
    if (tags) query.tags = { $in: tags.split(',').map(tag => tag.trim()) };
    const questions = await Question.find(query).select('-correctAnswer');
    console.log('Questions route - Success:', { count: questions.length, user: req.user.username });
    res.json(questions);
  } catch (error) {
    console.error('GET /api/questions - Error:', {
      message: error.message,
      stack: error.stack,
      user: req.user.username,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get single question
router.get('/:id([a-zA-Z0-9_-]+)', auth, teacherOnly, async (req, res) => {
  try {
    console.log('GET /api/questions/:id - Request:', { id: req.params.id, url: req.url });
    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log('Questions route - Invalid ID:', { id: req.params.id });
      return res.status(400).json({ error: 'Invalid question ID format' });
    }
    const question = await Question.findById(req.params.id).select('-correctAnswer');
    if (!question) {
      console.log('Questions route - Question not found:', { id: req.params.id });
      return res.status(404).json({ error: 'Question not found' });
    }
    if (!req.user.subjects.some(sub => sub.subject === question.subject && sub.class === question.class)) {
      console.log('Questions route - Not assigned:', { user: req.user.username, subject: question.subject, class: question.class });
      return res.status(403).json({ error: 'Not assigned to this subject/class' });
    }
    res.json(question);
  } catch (error) {
    console.error('GET /api/questions/:id - Error:', {
      message: error.message,
      stack: error.stack,
      user: req.user.username,
      id: req.params.id,
      timestamp: new Date().toISOString(),
    });
    res.status(400).json({ error: 'Invalid question ID or server error' });
  }
});

// Search questions
router.get('/search', auth, teacherOnly, async (req, res) => {
  try {
    const { subject, class: className, tags, text } = req.query;
    const query = {
      $or: req.user.subjects.map(sub => ({ subject: sub.subject, class: sub.class })),
    };
    if (subject) query.subject = subject;
    if (className) query.class = className;
    if (tags) query.tags = { $in: tags.split(',').map(tag => tag.trim()) };
    if (text) query.text = { $regex: text, $options: 'i' };
    const questions = await Question.find(query).select('-correctAnswer');
    console.log('Questions route - Search success:', { count: questions.length, query });
    res.json(questions);
  } catch (error) {
    console.error('GET /api/questions/search - Error:', {
      message: error.message,
      stack: error.stack,
      user: req.user.username,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: 'Failed to search questions' });
  }
});

// Create question
router.post('/', auth, teacherOnly, async (req, res) => {
  try {
    console.log('POST /api/questions - Request:', { body: req.body, url: req.url });
    const { subject, class: className, text, options, correctAnswer, marks, tags, testId, saveToBank, formula } = req.body;
    if (!subject || !className || !text || !options || !correctAnswer || !marks) {
      return res.status(400).json({ error: 'Missing required fields: subject, class, text, options, correctAnswer, marks' });
    }
    let parsedOptions;
    try {
      parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid options format' });
    }
    if (!Array.isArray(parsedOptions) || parsedOptions.length !== 4 || !parsedOptions.includes(correctAnswer)) {
      return res.status(400).json({ error: 'Four options required, and correctAnswer must match one option' });
    }
    if (parseInt(marks) <= 0) {
      return res.status(400).json({ error: 'Marks must be greater than 0' });
    }
    if (!req.user.subjects.some(sub => sub.subject === subject && sub.class === className)) {
      console.log('Questions route - Not assigned:', { user: req.user.username, subject, class: className });
      return res.status(403).json({ error: 'Not assigned to this subject/class' });
    }
    const questionData = {
      subject,
      class: className,
      text,
      options: parsedOptions,
      correctAnswer,
      marks: parseInt(marks),
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      formula: formula || null,
      createdBy: req.user.userId,
      saveToBank: saveToBank === 'true' || saveToBank === true,
    };
    if (testId && mongoose.isValidObjectId(testId)) {
      const test = await Test.findById(testId);
      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }
      if (test.subject !== subject || test.class !== className) {
        return res.status(400).json({ error: 'Question does not match test subject/class' });
      }
      if (test.status !== 'draft') {
        return res.status(403).json({ error: 'Can only add questions to draft tests' });
      }
      questionData.testId = testId;
    }
    const question = new Question(questionData);
    await question.save();
    if (testId && mongoose.isValidObjectId(testId)) {
      await Test.findByIdAndUpdate(testId, { $push: { questions: question._id } });
      console.log('Questions route - Added to test:', { testId, questionId: question._id });
    }
    console.log('Questions route - Created:', {
      questionId: question._id,
      subject,
      class: className,
      hasFormula: !!formula,
      timestamp: new Date().toISOString(),
    });
    res.status(201).json({ message: 'Question created', question });
  } catch (error) {
    console.error('POST /api/questions - Error:', {
      message: error.message,
      stack: error.stack,
      user: req.user?.username || 'unknown',
      url: req.url,
      timestamp: new Date().toISOString(),
    });
    res.status(400).json({ error: error.message || 'Failed to create question' });
  }
});

// Bulk import questions
router.post('/bulk', auth, teacherOnly, async (req, res) => {
  try {
    console.log('POST /api/questions/bulk - Request:', { body: req.body, url: req.url });
    const { questions, testId } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions must be a non-empty array' });
    }
    console.log('Questions route - Bulk importing:', { count: questions.length, testId });
    const invalidQuestions = [];
    const validQuestions = questions.map((q, index) => {
      const { subject, class: className, text, options, correctAnswer, marks, tags, formula } = q;
      if (!subject || !className || !text || !options || !correctAnswer || !marks) {
        invalidQuestions.push({ index: index + 1, error: 'Missing required fields' });
        return null;
      }
      let parsedOptions;
      try {
        parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
      } catch (e) {
        invalidQuestions.push({ index: index + 1, error: 'Invalid options format' });
        return null;
      }
      if (!Array.isArray(parsedOptions) || parsedOptions.length !== 4 || !parsedOptions.every(opt => opt.trim()) || !parsedOptions.includes(correctAnswer)) {
        invalidQuestions.push({ index: index + 1, error: 'Four non-empty options required, and correctAnswer must match one option' });
        return null;
      }
      if (parseInt(marks) <= 0) {
        invalidQuestions.push({ index: index + 1, error: 'Marks must be greater than 0' });
        return null;
      }
      if (!req.user.subjects.some(sub => sub.subject === subject && sub.class === className)) {
        invalidQuestions.push({ index: index + 1, error: 'Not assigned to this subject/class' });
        return null;
      }
      return {
        subject,
        class: className,
        text,
        options: parsedOptions,
        correctAnswer,
        marks: parseInt(marks),
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        formula: formula || null,
        createdBy: req.user.userId,
        saveToBank: q.saveToBank === 'true' || q.saveToBank === true,
        testId: testId && mongoose.isValidObjectId(testId) ? testId : null,
      };
    }).filter(q => q !== null);

    if (validQuestions.length === 0) {
      return res.status(400).json({ error: 'No valid questions provided', invalidQuestions });
    }

    if (testId && mongoose.isValidObjectId(testId)) {
      const test = await Test.findById(testId);
      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }
      if (!validQuestions.every(q => q.subject === test.subject && q.class === test.class)) {
        return res.status(400).json({ error: 'Questions must match test subject/class' });
      }
      if (test.status !== 'draft') {
        return res.status(403).json({ error: 'Can only add questions to draft tests' });
      }
    }

    const result = await Question.insertMany(validQuestions);
    if (testId && mongoose.isValidObjectId(testId)) {
      await Test.findByIdAndUpdate(testId, { $push: { questions: { $each: result.map(q => q._id) } } });
      console.log('Questions route - Added to test:', { testId, questionIds: result.map(q => q._id) });
    }

    console.log('Questions route - Bulk import complete:', { count: validQuestions.length, invalidCount: invalidQuestions.length });
    res.status(201).json({
      message: `Imported ${validQuestions.length} questions successfully`,
      count: validQuestions.length,
      insertedIds: result.map(q => q._id),
      invalidQuestions: invalidQuestions.length > 0 ? invalidQuestions : undefined,
    });
  } catch (error) {
    console.error('POST /api/questions/bulk - Error:', {
      message: error.message,
      stack: error.stack,
      user: req.user?.username || 'unknown',
      url: req.url,
      timestamp: new Date().toISOString(),
    });
    res.status(400).json({ error: error.message || 'Failed to import questions' });
  }
});

// Update question
router.put('/:id([a-zA-Z0-9_-]+)', auth, teacherOnly, async (req, res) => {
  try {
    console.log('PUT /api/questions/:id - Request:', { body: req.body, id: req.params.id, url: req.url });
    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log('Questions route - Invalid ID:', { id: req.params.id });
      return res.status(400).json({ error: 'Invalid question ID format' });
    }
    const { subject, class: className, text, options, correctAnswer, marks, tags, testId, saveToBank, formula } = req.body;
    if (!subject || !className || !text || !options || !correctAnswer || !marks) {
      return res.status(400).json({ error: 'Missing required fields: subject, class, text, options, correctAnswer, marks' });
    }
    let parsedOptions;
    try {
      parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid options format' });
    }
    if (!Array.isArray(parsedOptions) || parsedOptions.length !== 4 || !parsedOptions.includes(correctAnswer)) {
      return res.status(400).json({ error: 'Four options required, and correctAnswer must match one option' });
    }
    if (parseInt(marks) <= 0) {
      return res.status(400).json({ error: 'Marks must be greater than 0' });
    }
    const question = await Question.findById(req.params.id);
    if (!question) {
      console.log('Questions route - Question not found:', { id: req.params.id });
      return res.status(404).json({ error: 'Question not found' });
    }
    if (!req.user.subjects.some(sub => sub.subject === subject && sub.class === className)) {
      console.log('Questions route - Not assigned:', { user: req.user.username, subject, class: className });
      return res.status(403).json({ error: 'Not assigned to this subject/class' });
    }
    question.subject = subject;
    question.class = className;
    question.text = text;
    question.options = parsedOptions;
    question.correctAnswer = correctAnswer;
    question.marks = parseInt(marks);
    question.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
    question.formula = formula || null;
    question.saveToBank = saveToBank === 'true' || saveToBank === true;
    question.updatedAt = new Date();
    if (testId && mongoose.isValidObjectId(testId)) {
      const test = await Test.findById(testId);
      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }
      if (test.subject !== subject || test.class !== className) {
        return res.status(400).json({ error: 'Question does not match test subject/class' });
      }
      if (test.status !== 'draft') {
        return res.status(403).json({ error: 'Can only update questions in draft tests' });
      }
      question.testId = testId;
    }
    await question.save();
    console.log('Questions route - Updated:', {
      questionId: question._id,
      subject,
      class: className,
      hasFormula: !!formula,
      timestamp: new Date().toISOString(),
    });
    res.json({ message: 'Question updated', question });
  } catch (error) {
    console.error('PUT /api/questions/:id - Error:', {
      message: error.message,
      stack: error.stack,
      user: req.user?.username || 'unknown',
      questionId: req.params.id,
      url: req.url,
      timestamp: new Date().toISOString(),
    });
    res.status(400).json({ error: error.message || 'Failed to update question' });
  }
});

// Delete question
router.delete('/:id([a-zA-Z0-9_-]+)', auth, teacherOnly, async (req, res) => {
  try {
    console.log('DELETE /api/questions/:id - Request:', { id: req.params.id, url: req.url });
    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log('Questions route - Invalid ID:', { id: req.params.id });
      return res.status(400).json({ error: 'Invalid question ID format' });
    }
    const question = await Question.findById(req.params.id);
    if (!question) {
      console.log('Questions route - Question not found:', { id: req.params.id });
      return res.status(404).json({ error: 'Question not found' });
    }
    if (!req.user.subjects.some(sub => sub.subject === question.subject && sub.class === question.class)) {
      console.log('Questions route - Not assigned:', { user: req.user.username, subject: question.subject, class: question.class });
      return res.status(403).json({ error: 'Not assigned to this subject/class' });
    }
    const tests = await Test.find({ questions: req.params.id });
    if (tests.some(test => test.status !== 'draft')) {
      return res.status(403).json({ error: 'Cannot delete question used in non-draft tests' });
    }
    await question.deleteOne();
    console.log('Questions route - Deleted:', { questionId: req.params.id });
    res.json({ message: 'Question deleted' });
  } catch (error) {
    console.error('DELETE /api/questions/:id - Error:', {
      message: error.message,
      stack: error.stack,
      user: req.user?.username || 'unknown',
      questionId: req.params.id,
      url: req.url,
      timestamp: new Date().toISOString(),
    });
    res.status(400).json({ error: error.message || 'Failed to delete question' });
  }
});

module.exports = router;