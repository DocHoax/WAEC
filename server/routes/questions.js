const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Test = require('../models/Test');
const { auth, teacherOnly } = require('../middleware/auth');
const mongoose = require('mongoose');

router.get('/', auth, teacherOnly, async (req, res) => {
  try {
    const { subject, class: className, tags } = req.query;
    const query = {
      $or: req.user.subjects.map(sub => ({ subject: sub.subject, class: sub.class })),
    };
    if (subject) query.subject = subject;
    if (className) query.class = className;
    if (tags) query.tags = { $in: tags.split(',').map(tag => tag.trim()) };
    const questions = await Question.find(query).select('-correctAnswer').lean();
    res.json(questions);
  } catch (error) {
    console.error('GET /api/questions - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', auth, teacherOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }
    const question = await Question.findById(id).select('-correctAnswer').lean();
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    if (!req.user.subjects.some(sub => sub.subject === question.subject && sub.class === question.class)) {
      return res.status(403).json({ error: 'Not assigned to this subject/class' });
    }
    res.json(question);
  } catch (error) {
    console.error('GET /api/questions/:id - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

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
    const questions = await Question.find(query).select('-correctAnswer').lean();
    res.json(questions);
  } catch (error) {
    console.error('GET /api/questions/search - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, teacherOnly, async (req, res) => {
  try {
    const { subject, class: className, text, options, correctAnswer, marks, tags, testId, saveToBank, formula } = req.body;
    if (!subject || !className || !text || !options || !correctAnswer || !marks) {
      return res.status(400).json({ error: 'Missing required fields: subject, class, text, options, correctAnswer, marks' });
    }
    let parsedOptions;
    try {
      parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
      if (!Array.isArray(parsedOptions) || parsedOptions.length !== 4 || !parsedOptions.every(opt => typeof opt === 'string' && opt.trim()) || !parsedOptions.includes(correctAnswer)) {
        return res.status(400).json({ error: 'Four non-empty options required, and correctAnswer must match one option' });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Invalid options format' });
    }
    if (isNaN(Number(marks)) || Number(marks) <= 0) {
      return res.status(400).json({ error: 'Marks must be a positive number' });
    }
    if (!req.user.subjects.some(sub => sub.subject === subject && sub.class === className)) {
      return res.status(403).json({ error: 'Not assigned to this subject/class' });
    }
    const questionData = {
      subject,
      class: className,
      text,
      options: parsedOptions,
      correctAnswer,
      marks: Number(marks),
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      formula: formula || null,
      createdBy: req.user.userId,
      saveToBank: saveToBank === 'true' || saveToBank === true,
    };
    if (testId) {
      if (!mongoose.isValidObjectId(testId)) {
        return res.status(400).json({ error: 'Invalid test ID' });
      }
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
    if (testId) {
      await Test.findByIdAndUpdate(testId, { $push: { questions: question._id } });
    }
    res.status(201).json({ message: 'Question created', question });
  } catch (error) {
    console.error('POST /api/questions - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/bulk', auth, teacherOnly, async (req, res) => {
  try {
    const { questions, testId } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions must be a non-empty array' });
    }
    const invalidQuestions = [];
    const validQuestions = [];
    for (const [index, q] of questions.entries()) {
      const { subject, class: className, text, options, correctAnswer, marks, tags, formula } = q;
      if (!subject || !className || !text || !options || !correctAnswer || !marks) {
        invalidQuestions.push({ index: index + 1, error: 'Missing required fields' });
        continue;
      }
      let parsedOptions;
      try {
        parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
        if (!Array.isArray(parsedOptions) || parsedOptions.length !== 4 || !parsedOptions.every(opt => typeof opt === 'string' && opt.trim()) || !parsedOptions.includes(correctAnswer)) {
          invalidQuestions.push({ index: index + 1, error: 'Four non-empty options required, and correctAnswer must match one option' });
          continue;
        }
      } catch (e) {
        invalidQuestions.push({ index: index + 1, error: 'Invalid options format' });
        continue;
      }
      if (isNaN(Number(marks)) || Number(marks) <= 0) {
        invalidQuestions.push({ index: index + 1, error: 'Marks must be a positive number' });
        continue;
      }
      if (!req.user.subjects.some(sub => sub.subject === subject && sub.class === className)) {
        invalidQuestions.push({ index: index + 1, error: 'Not assigned to this subject/class' });
        continue;
      }
      validQuestions.push({
        subject,
        class: className,
        text,
        options: parsedOptions,
        correctAnswer,
        marks: Number(marks),
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        formula: formula || null,
        createdBy: req.user.userId,
        saveToBank: q.saveToBank === 'true' || q.saveToBank === true,
        testId: testId && mongoose.isValidObjectId(testId) ? testId : null,
      });
    }
    if (validQuestions.length === 0) {
      return res.status(400).json({ error: 'No valid questions provided', invalidQuestions });
    }
    if (testId) {
      if (!mongoose.isValidObjectId(testId)) {
        return res.status(400).json({ error: 'Invalid test ID' });
      }
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
    if (testId) {
      await Test.findByIdAndUpdate(testId, { $push: { questions: { $each: result.map(q => q._id) } } });
    }
    res.status(201).json({
      message: `Imported ${validQuestions.length} questions successfully`,
      count: validQuestions.length,
      insertedIds: result.map(q => q._id),
      invalidQuestions: invalidQuestions.length > 0 ? invalidQuestions : undefined,
    });
  } catch (error) {
    console.error('POST /api/questions/bulk - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', auth, teacherOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }
    const { subject, class: className, text, options, correctAnswer, marks, tags, testId, saveToBank, formula } = req.body;
    if (!subject || !className || !text || !options || !correctAnswer || !marks) {
      return res.status(400).json({ error: 'Missing required fields: subject, class, text, options, correctAnswer, marks' });
    }
    let parsedOptions;
    try {
      parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
      if (!Array.isArray(parsedOptions) || parsedOptions.length !== 4 || !parsedOptions.every(opt => typeof opt === 'string' && opt.trim()) || !parsedOptions.includes(correctAnswer)) {
        return res.status(400).json({ error: 'Four non-empty options required, and correctAnswer must match one option' });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Invalid options format' });
    }
    if (isNaN(Number(marks)) || Number(marks) <= 0) {
      return res.status(400).json({ error: 'Marks must be a positive number' });
    }
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    if (!req.user.subjects.some(sub => sub.subject === subject && sub.class === className)) {
      return res.status(403).json({ error: 'Not assigned to this subject/class' });
    }
    if (testId) {
      if (!mongoose.isValidObjectId(testId)) {
        return res.status(400).json({ error: 'Invalid test ID' });
      }
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
    question.subject = subject;
    question.class = className;
    question.text = text;
    question.options = parsedOptions;
    question.correctAnswer = correctAnswer;
    question.marks = Number(marks);
    question.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
    question.formula = formula || null;
    question.saveToBank = saveToBank === 'true' || saveToBank === true;
    question.updatedAt = new Date();
    await question.save();
    res.json({ message: 'Question updated', question });
  } catch (error) {
    console.error('PUT /api/questions/:id - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth, teacherOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    if (!req.user.subjects.some(sub => sub.subject === question.subject && sub.class === question.class)) {
      return res.status(403).json({ error: 'Not assigned to this subject/class' });
    }
    const tests = await Test.find({ questions: id });
    if (tests.some(test => test.status !== 'draft')) {
      return res.status(403).json({ error: 'Cannot delete question used in non-draft tests' });
    }
    await question.deleteOne();
    await Test.updateMany({ questions: id }, { $pull: { questions: id } });
    res.json({ message: 'Question deleted' });
  } catch (error) {
    console.error('DELETE /api/questions/:id - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;