const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Result = require('../models/Result');
const User = require('../models/User');
const { auth, teacherOnly, adminOnly } = require('../middleware/auth');

// Teacher creates a test
router.post('/', auth, teacherOnly, async (req, res) => {
  try {
    const { subject, class: className, title, instructions, duration, randomize, session, questions, questionCount, totalMarks, questionMarks } = req.body;
    console.log('Tests route - Creating test:', {
      subject,
      class: className,
      title,
      duration,
      session,
      questionCount,
      totalMarks,
      randomize,
      user: req.user.username,
      userSubjects: req.user.subjects,
      questions: questions?.map(id => id.toString()) || [],
      questionMarks
    });

    const missingFields = [];
    if (!title || typeof title !== 'string' || title.trim() === '') missingFields.push('title');
    if (!subject || typeof subject !== 'string' || subject.trim() === '') missingFields.push('subject');
    if (!className || typeof className !== 'string' || className.trim() === '') missingFields.push('class');
    if (!duration && duration !== 0) missingFields.push('duration');
    if (!session || typeof session !== 'string' || session.trim() === '') missingFields.push('session');
    if (!questionCount && questionCount !== 0) missingFields.push('questionCount');
    if (!totalMarks && totalMarks !== 0) missingFields.push('totalMarks');
    if (missingFields.length > 0) {
      console.log('Tests route - Missing or invalid fields:', missingFields);
      return res.status(400).json({ error: `Missing or invalid fields: ${missingFields.join(', ')}` });
    }

    const parsedQuestionCount = Number(questionCount);
    const parsedDuration = Number(duration);
    const parsedTotalMarks = Number(totalMarks);
    if (isNaN(parsedQuestionCount) || parsedQuestionCount < 1) {
      console.log('Tests route - Invalid questionCount:', questionCount);
      return res.status(400).json({ error: 'Question count must be a positive number.' });
    }
    if (isNaN(parsedDuration) || parsedDuration < 1) {
      console.log('Tests route - Invalid duration:', duration);
      return res.status(400).json({ error: 'Duration must be a positive number.' });
    }
    if (isNaN(parsedTotalMarks) || parsedTotalMarks < 1) {
      console.log('Tests route - Invalid totalMarks:', totalMarks);
      return res.status(400).json({ error: 'Total marks must be a positive number.' });
    }
    if (!['Continuous Assessment 1 (CA 1)', 'Continuous Assessment 2 (CA 2)', 'Examination'].includes(title)) {
      console.log('Tests route - Invalid title:', title);
      return res.status(400).json({ error: 'Title must be Continuous Assessment 1 (CA 1), Continuous Assessment 2 (CA 2), or Examination.' });
    }
    if (title.includes('CA') && parsedTotalMarks !== 20) {
      console.log('Tests route - Invalid totalMarks for CA:', totalMarks);
      return res.status(400).json({ error: 'Continuous Assessments must have exactly 20 marks.' });
    }
    if (title === 'Examination' && parsedTotalMarks !== 60) {
      console.log('Tests route - Invalid totalMarks for Examination:', totalMarks);
      return res.status(400).json({ error: 'Examinations must have exactly 60 marks.' });
    }
    if (!Array.isArray(req.user.subjects) || !req.user.subjects.some(sub => sub.subject === subject && sub.class === className)) {
      console.log('Tests route - Not assigned:', { user: req.user.username, subject, class: className, userSubjects: req.user.subjects });
      return res.status(403).json({ error: 'You are not assigned to this subject/class.' });
    }
    if (!session.match(/^\d{4}\/\d{4} (First|Second|Third) Term$/)) {
      console.log('Tests route - Invalid session format:', session);
      return res.status(400).json({ error: 'Invalid session format. Use "YYYY/YYYY First/Second/Third Term".' });
    }
    if (questions && questions.length > 0) {
      const questionDocs = await Question.find({ _id: { $in: questions.map(id => new mongoose.Types.ObjectId(id)) } });
      if (questionDocs.length !== questions.length) {
        console.log('Tests route - Invalid question IDs:', { questions });
        return res.status(400).json({ error: 'One or more question IDs are invalid.' });
      }
      if (!questionDocs.every(q => q.subject === subject && q.class === className)) {
        console.log('Tests route - Questions mismatch:', { subject, class: className });
        return res.status(400).json({ error: 'Questions must match test subject and class.' });
      }
      if (!questionDocs.every(q => 
        Array.isArray(q.options) && 
        q.options.length > 0 && 
        q.options.every(opt => typeof opt === 'string' && opt.trim()) && 
        typeof q.text === 'string' && 
        q.text.trim() && 
        typeof q.correctAnswer === 'string' && 
        q.correctAnswer.trim()
      )) {
        console.log('Tests route - Invalid question data:', {
          invalidQuestions: questionDocs
            .filter(q => 
              !Array.isArray(q.options) || 
              q.options.length === 0 || 
              !q.options.every(opt => typeof opt === 'string' && opt.trim()) || 
              typeof q.text !== 'string' || 
              !q.text.trim() || 
              typeof q.correctAnswer !== 'string' || 
              !q.correctAnswer.trim()
            )
            .map(q => ({ _id: q._id, text: q.text, options: q.options, correctAnswer: q.correctAnswer }))
        });
        return res.status(400).json({ error: 'All questions must have valid text, non-empty options array, and a correct answer.' });
      }
      if (questions.length > parsedQuestionCount) {
        console.log('Tests route - Too many questions:', { parsedQuestionCount, questionsLength: questions.length });
        return res.status(400).json({ error: `Number of questions (${questions.length}) exceeds question count (${parsedQuestionCount}).` });
      }
      if (questionMarks && Array.isArray(questionMarks)) {
        if (questionMarks.length !== questions.length) {
          console.log('Tests route - Mismatch question marks:', { questionsLength: questions.length, marksLength: questionMarks.length });
          return res.status(400).json({ error: 'Number of question marks must match number of questions.' });
        }
        const totalMarksSum = questionMarks.reduce((sum, mark) => sum + Number(mark), 0);
        if (totalMarksSum !== parsedTotalMarks) {
          console.log('Tests route - Invalid total marks:', { totalMarksSum, expected: parsedTotalMarks });
          return res.status(400).json({ error: `Sum of question marks (${totalMarksSum}) must equal total marks (${parsedTotalMarks}).` });
        }
      }
    }

    const test = new Test({
      subject,
      class: className,
      title,
      instructions,
      duration: parsedDuration,
      randomize,
      session,
      questionCount: parsedQuestionCount,
      totalMarks: parsedTotalMarks,
      createdBy: new mongoose.Types.ObjectId(req.user.userId),
      questions: questions?.map(id => new mongoose.Types.ObjectId(id)) || [],
      questionMarks: questionMarks || [],
      status: 'draft',
      batches: [],
    });

    await test.save();
    console.log('Tests route - Created:', { testId: test._id, questionCount: test.questions.length, totalMarks, questionMarks });
    res.status(201).json(test);
  } catch (error) {
    console.error('Tests route - Error:', {
      error: error.message,
      code: error.code,
      request: req.body,
      stack: error.stack
    });
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: `Validation failed: ${errors.join(', ')}` });
    }
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate test entry detected.' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin schedules a test
router.put('/:id/schedule', auth, adminOnly, async (req, res) => {
  try {
    const { batches, status } = req.body;
    console.log('Tests route - Scheduling test:', { id: req.params.id, user: req.user.username, payload: req.body });

    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log('Tests route - Invalid test ID:', { id: req.params.id });
      return res.status(400).json({ error: 'Invalid test ID format.' });
    }
    const test = await Test.findById(req.params.id);
    if (!test) {
      console.log('Tests route - Test not found:', { id: req.params.id });
      return res.status(404).json({ error: 'Test not found.' });
    }

    if (status && !['draft', 'scheduled', 'active', 'completed'].includes(status)) {
      console.log('Tests route - Invalid status:', status);
      return res.status(400).json({ error: 'Invalid status. Use "draft", "scheduled", "active", or "completed".' });
    }

    if (batches) {
      if (!Array.isArray(batches)) {
        console.log('Tests route - Invalid batches:', batches);
        return res.status(400).json({ error: 'Batches must be an array.' });
      }
      for (const batch of batches) {
        if (!batch.name || !batch.schedule?.start || !batch.schedule?.end) {
          console.log('Tests route - Invalid batch data:', batch);
          return res.status(400).json({ error: 'Each batch requires name, start, and end time.' });
        }
        if (new Date(batch.schedule.start) >= new Date(batch.schedule.end)) {
          console.log('Tests route - Invalid schedule:', batch.schedule);
          return res.status(400).json({ error: `Invalid schedule for batch ${batch.name}: End time must be after start time.` });
        }
        for (const studentId of batch.students || []) {
          if (!mongoose.isValidObjectId(studentId)) {
            console.log('Tests route - Invalid student ID:', studentId);
            return res.status(400).json({ error: `Invalid student ID: ${studentId}` });
          }
          const student = await User.findById(studentId);
          if (!student || student.role !== 'student' || !student.enrolledSubjects.some(sub => sub.subject === test.subject && sub.class === test.class)) {
            console.log('Tests route - Invalid student:', studentId);
            return res.status(400).json({ error: `Student ${studentId} is not enrolled in ${test.subject}/${test.class}.` });
          }
        }
      }
      test.batches = batches.map(batch => ({
        ...batch,
        students: batch.students.map(id => new mongoose.Types.ObjectId(id)),
        schedule: {
          start: new Date(batch.schedule.start),
          end: new Date(batch.schedule.end),
        },
      }));
    }

    if (status) test.status = status;
    await test.save();
    console.log('Tests route - Scheduled:', { testId: test._id, status, batches: test.batches?.map(b => ({ name: b.name, students: b.students })) });
    res.json(test);
  } catch (error) {
    console.error('Tests route - Error:', {
      error: error.message,
      request: req.body,
      stack: error.stack
    });
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch all tests
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching tests for:', { user: req.user.username, role: req.user.role });
    let query = {};
    if (req.user.role === 'teacher') {
      query = { 
        subject: { $in: req.user.subjects?.map(sub => sub.subject) || [] },
        class: { $in: req.user.subjects?.map(sub => sub.class) || [] }
      };
    } else if (req.user.role === 'student') {
      query = {
        status: 'scheduled',
        'batches.students': { $in: [new mongoose.Types.ObjectId(req.user.userId)] },
        subject: { $in: req.user.enrolledSubjects?.map(sub => sub.subject) || [] },
        class: { $in: req.user.enrolledSubjects?.map(sub => sub.class) || [] },
      };
    } else if (req.user.role !== 'admin') {
      console.log('Tests query - Access denied:', { user: req.user.username });
      return res.status(403).json({ error: 'Access restricted to authorized users.' });
    }
    const tests = await Test.find(query).populate('createdBy', 'username');
    console.log('Tests fetched:', { count: tests.length, testIds: tests.map(t => t._id.toString()) });
    return res.json(tests);
  } catch (err) {
    console.error('Tests query error:', {
      error: err.message,
      stack: err.stack
    });
    return res.status(500).json({ error: 'Server error' });
  }
});

// Fetch all tests for admin
router.get('/admin', auth, adminOnly, async (req, res) => {
  try {
    console.log('Admin fetch tests:', { user: req.user.username });
    const tests = await Test.find().populate('createdBy', 'username');
    console.log('Admin fetched:', { count: tests.length, testIds: tests.map(t => t._id.toString()) });
    return res.json(tests);
  } catch (err) {
    console.error('Admin fetch error:', {
      error: err.message,
      stack: err.stack
    });
    return res.status(500).json({ error: 'Server error' });
  }
});

// Fetch a specific test
router.get('/:testId', auth, async (req, res) => {
  try {
    console.log('Fetching test:', { testId: req.params.testId, user: req.user.username, userId: req.user.userId });
    if (!mongoose.isValidObjectId(req.params.testId)) {
      console.log('Invalid test ID:', { testId: req.params.testId });
      return res.status(400).json({ error: 'Invalid test ID format.' });
    }
    const test = await Test.findById(req.params.testId).populate({
      path: 'questions',
      select: '_id text options correctAnswer subject class marks',
      match: { 
        text: { $exists: true, $ne: '', $type: 'string' },
        options: { $exists: true, $ne: [], $type: 'array', $not: { $elemMatch: { $type: 'null', $in: [null, '', undefined] } } },
        correctAnswer: { $exists: true, $ne: '', $type: 'string' }
      }
    }).populate('createdBy', 'username').lean();
    if (!test) {
      console.log('Test not found:', { testId: req.params.testId });
      return res.status(404).json({ error: 'Test not found.' });
    }
    test.questions = (test.questions || []).filter(
      q => q._id && 
           typeof q.text === 'string' && q.text.trim() && 
           Array.isArray(q.options) && q.options.length > 0 && 
           q.options.every(opt => typeof opt === 'string' && opt.trim()) &&
           typeof q.correctAnswer === 'string' && q.correctAnswer.trim()
    );
    if (req.user.role === 'teacher' && !req.user.subjects.some(sub => sub.subject === test.subject && sub.class === test.class)) {
      console.log('Not assigned:', { user: req.user.username, subject: test.subject, class: test.class });
      return res.status(403).json({ error: 'You are not assigned to this test\'s subject/class.' });
    }
    if (req.user.role === 'student') {
      const batch = test.batches?.find(b => 
        b.students.some(id => id.equals(new mongoose.Types.ObjectId(req.user.userId)))
      );
      if (!batch) {
        console.log('Student not in batch:', { 
          userId: req.user.userId, 
          batches: test.batches?.map(b => ({ name: b.name, students: b.students })) 
        });
        return res.status(403).json({ error: 'You are not assigned to this test.' });
      }
      const now = new Date();
      const start = new Date(batch.schedule.start);
      const end = new Date(batch.schedule.end);
      if (now < start || now > end) {
        console.log('Test not available:', { 
          userId: req.user.userId, 
          now: now.toISOString(), 
          start: start.toISOString(), 
          end: end.toISOString() 
        });
        return res.status(403).json({ error: 'Test not available at this time.' });
      }
      test.questions = test.questions.map(q => ({
        _id: q._id,
        text: q.text,
        options: q.options,
        subject: q.subject,
        class: q.class,
        marks: q.marks,
      }));
    }
    console.log('Test fetch success:', { 
      testId: test._id, 
      questionCount: test.questions.length, 
      totalMarks: test.totalMarks,
      questionMarks: test.questionMarks,
      questions: test.questions.map(q => ({ _id: q._id, text: q.text, options: q.options, marks: q.marks }))
    });
    res.json(test);
  } catch (error) {
    console.error('Test fetch error:', {
      error: error.message,
      testId: req.params.testId,
      user: req.user.username,
      userId: req.user.userId,
      stack: error.stack
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch test results
router.get('/:testId/results', auth, async (req, res) => {
  try {
    console.log('Fetching results:', { testId: req.params.testId, user: req.user.username, role: req.user.role });
    if (!mongoose.isValidObjectId(req.params.testId)) {
      console.log('Invalid test ID:', { testId: req.params.testId });
      return res.status(400).json({ error: 'Invalid test ID format.' });
    }
    const test = await Test.findById(req.params.testId);
    if (!test) {
      console.log('Test not found:', { testId: req.params.testId });
      return res.status(404).json({ error: 'Test not found.' });
    }
    if (req.user.role === 'student') {
      console.log('Access denied:', { user: req.user.username });
      return res.status(403).json({ error: 'Students cannot view test results.' });
    }
    if (req.user.role === 'teacher' && !req.user.subjects.some(sub => sub.subject === test.subject && sub.class === test.class)) {
      console.log('Not assigned:', { user: req.user.username });
      return res.status(403).json({ error: 'You are not assigned to this test\'s subject/class.' });
    }
    const results = await Result.find({ testId: req.params.testId })
      .populate('userId', 'username name')
      .populate({
        path: 'testId',
        populate: { path: 'questions', select: '_id text correctAnswer marks' }
      });
    console.log('Results fetched:', { count: results.length, testId: req.params.testId });
    res.json(results);
  } catch (error) {
    console.error('Results fetch error:', {
      error: error.message,
      testId: req.params.testId,
      user: req.user.username,
      stack: error.stack
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit test answers
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const { answers, userId } = req.body;
    console.log('Submitting test:', { testId: req.params.id, userId });
    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log('Invalid test ID:', { testId: req.params.id });
      return res.status(400).json({ error: 'Invalid test ID format.' });
    }
    if (!mongoose.isValidObjectId(userId)) {
      console.log('Invalid user ID:', { userId });
      return res.status(400).json({ error: 'Invalid user ID format.' });
    }
    const test = await Test.findById(req.params.id).populate({
      path: 'questions',
      select: '_id text options correctAnswer marks',
      match: { 
        text: { $exists: true, $ne: '', $type: 'string' },
        options: { $exists: true, $ne: [], $type: 'array', $not: { $elemMatch: { $type: 'null', $in: [null, '', undefined] } } },
        correctAnswer: { $exists: true, $ne: '', $type: 'string' }
      }
    });
    if (!test) {
      console.log('Test not found:', { testId: req.params.id });
      return res.status(404).json({ error: 'Test not found.' });
    }
    if (test.status !== 'scheduled') {
      console.log('Test not scheduled:', { testId: req.params.id });
      return res.status(403).json({ error: 'Test is not scheduled.' });
    }
    const batch = test.batches?.find(b => 
      b.students.some(id => id.equals(new mongoose.Types.ObjectId(userId)))
    );
    if (!batch) {
      console.log('Student not in batch:', { userId });
      return res.status(403).json({ error: 'You are not assigned to this test.' });
    }
    const now = new Date();
    if (now < new Date(batch.schedule.start) || now > new Date(batch.schedule.end)) {
      console.log('Test not available:', { userId, start: batch.schedule.start, end: batch.schedule.end });
      return res.status(403).json({ error: 'Test not available at this time.' });
    }
    if (
      req.user.role === 'student' &&
      !req.user.enrolledSubjects.some(sub => sub.subject === test.subject && sub.class === test.class)
    ) {
      console.log('Not enrolled:', { user: req.user.username, subject: test.subject, class: test.class });
      return res.status(403).json({ error: 'You are not enrolled in this subject/class.' });
    }
    if (test.questions.length === 0) {
      console.log('No valid questions:', { testId: test._id, questionCount: test.questionCount });
      return res.status(400).json({ error: 'No valid questions available for this test.' });
    }
    if (test.questions.length !== test.questionCount) {
      console.log('Question count mismatch:', { testId: test._id, questions: test.questions.length, questionCount: test.questionCount });
      return res.status(400).json({ error: 'Test questions do not match the specified question count.' });
    }
    let score = 0;
    const correctness = new Map();
    for (const [index, q] of test.questions.entries()) {
      const selectedAnswer = answers[q._id.toString()] || null;
      const isCorrect = selectedAnswer === q.correctAnswer;
      if (isCorrect) score += test.questionMarks[index] || q.marks || 1;
      correctness.set(q._id.toString(), isCorrect);
    }
    const result = new Result({
      userId: new mongoose.Types.ObjectId(userId),
      testId: req.params.id,
      answers: answers,
      correctness: correctness,
      score,
      totalQuestions: test.questions.length,
      totalMarks: test.totalMarks,
      subject: test.subject,
      class: test.class,
      session: test.session,
    });
    await result.save();
    console.log('Submission success:', { testId: req.params.id, score, totalMarks: test.totalMarks });
    res.json({ message: 'Test submitted' });
  } catch (error) {
    console.error('Submission error:', {
      error: error.message,
      request: req.body,
      stack: error.stack
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Teacher updates a test
router.put('/:id', auth, teacherOnly, async (req, res) => {
  try {
    const { title, subject, class: className, session, instructions, duration, randomize, questions, questionCount, totalMarks, questionMarks } = req.body;
    console.log('Updating test:', { id: req.params.id, user: req.user.username, payload: req.body });
    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log('Invalid test ID:', { id: req.params.id });
      return res.status(400).json({ error: 'Invalid test ID format.' });
    }
    const test = await Test.findById(req.params.id);
    if (!test) {
      console.log('Test not found:', { id: req.params.id });
      return res.status(404).json({ error: 'Test not found.' });
    }
    if (!req.user.subjects.some(sub => sub.subject === test.subject && sub.class === test.class)) {
      console.log('Not assigned:', { user: req.user.username, subject: test.subject, class: test.class });
      return res.status(403).json({ error: 'You are not assigned to this test\'s subject/class.' });
    }
    const invalidFields = [];
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) invalidFields.push('title');
    if (subject !== undefined && (typeof subject !== 'string' || subject.trim() === '')) invalidFields.push('subject');
    if (className !== undefined && (typeof className !== 'string' || className.trim() === '')) invalidFields.push('class');
    if (duration !== undefined && (isNaN(Number(duration)) || Number(duration) < 1)) invalidFields.push('duration');
    if (session !== undefined && (typeof session !== 'string' || session.trim() === '')) invalidFields.push('session');
    if (questionCount !== undefined && (isNaN(Number(questionCount)) || Number(questionCount) < 1)) invalidFields.push('questionCount');
    if (totalMarks !== undefined && (isNaN(Number(totalMarks)) || Number(totalMarks) < 1)) invalidFields.push('totalMarks');
    if (invalidFields.length > 0) {
      console.log('Invalid fields:', invalidFields);
      return res.status(400).json({ error: `Invalid fields: ${invalidFields.join(', ')}` });
    }
    if (title !== undefined && !['Continuous Assessment 1 (CA 1)', 'Continuous Assessment 2 (CA 2)', 'Examination'].includes(title)) {
      console.log('Invalid title:', title);
      return res.status(400).json({ error: 'Title must be Continuous Assessment 1 (CA 1), Continuous Assessment 2 (CA 2), or Examination.' });
    }
    if (totalMarks !== undefined) {
      if (title && title.includes('CA') && Number(totalMarks) !== 20) {
        console.log('Invalid totalMarks for CA:', totalMarks);
        return res.status(400).json({ error: 'Continuous Assessments must have exactly 20 marks.' });
      }
      if (title && title === 'Examination' && Number(totalMarks) !== 60) {
        console.log('Invalid totalMarks for Examination:', totalMarks);
        return res.status(400).json({ error: 'Examinations must have exactly 60 marks.' });
      }
    }
    const parsedQuestionCount = questionCount !== undefined ? Number(questionCount) : test.questionCount;
    const parsedDuration = duration !== undefined ? Number(duration) : test.duration;
    const parsedTotalMarks = totalMarks !== undefined ? Number(totalMarks) : test.totalMarks;
    if (subject && className && !req.user.subjects.some(sub => sub.subject === subject && sub.class === className)) {
      console.log('Not assigned:', { user: req.user.username, subject, class: className });
      return res.status(403).json({ error: 'You are not assigned to this subject/class.' });
    }
    if (questions && questions.length > 0) {
      const questionDocs = await Question.find({ _id: { $in: questions.map(id => new mongoose.Types.ObjectId(id)) } });
      if (questionDocs.length !== questions.length) {
        console.log('Invalid question IDs:', { questions });
        return res.status(400).json({ error: 'One or more question IDs are invalid.' });
      }
      const testSubject = subject || test.subject;
      const testClass = className || test.class;
      if (!questionDocs.every(q => q.subject === testSubject && q.class === testClass)) {
        console.log('Questions mismatch:', { subject: testSubject, class: testClass });
        return res.status(400).json({ error: 'Questions must match test subject and class.' });
      }
      if (!questionDocs.every(q => 
        Array.isArray(q.options) && 
        q.options.length > 0 && 
        q.options.every(opt => typeof opt === 'string' && opt.trim()) && 
        typeof q.text === 'string' && 
        q.text.trim() && 
        typeof q.correctAnswer === 'string' && 
        q.correctAnswer.trim()
      )) {
        console.log('Invalid question data:', {
          invalidQuestions: questionDocs
            .filter(q => 
              !Array.isArray(q.options) || 
              q.options.length === 0 || 
              !q.options.every(opt => typeof opt === 'string' && opt.trim()) || 
              typeof q.text !== 'string' || 
              !q.text.trim() || 
              typeof q.correctAnswer !== 'string' || 
              !q.correctAnswer.trim()
            )
            .map(q => ({ _id: q._id, text: q.text, options: q.options, correctAnswer: q.correctAnswer }))
        });
        return res.status(400).json({ error: 'All questions must have valid text, non-empty options array, and a correct answer.' });
      }
      if (questions.length > parsedQuestionCount) {
        console.log('Too many questions:', { parsedQuestionCount, questionsLength: questions.length });
        return res.status(400).json({ error: `Number of questions (${questions.length}) exceeds question count (${parsedQuestionCount}).` });
      }
      if (questionMarks && Array.isArray(questionMarks)) {
        if (questionMarks.length !== questions.length) {
          console.log('Tests route - Mismatch question marks:', { questionsLength: questions.length, marksLength: questionMarks.length });
          return res.status(400).json({ error: 'Number of question marks must match number of questions.' });
        }
        const totalMarksSum = questionMarks.reduce((sum, mark) => sum + Number(mark), 0);
        if (totalMarksSum !== parsedTotalMarks) {
          console.log('Tests route - Invalid total marks:', { totalMarksSum, expected: parsedTotalMarks });
          return res.status(400).json({ error: `Sum of question marks (${totalMarksSum}) must equal total marks (${parsedTotalMarks}).` });
        }
      }
    }
    if (title !== undefined) test.title = title;
    if (subject !== undefined) test.subject = subject;
    if (className !== undefined) test.class = className;
    if (session !== undefined) test.session = session;
    if (instructions !== undefined) test.instructions = instructions;
    if (duration !== undefined) test.duration = parsedDuration;
    if (randomize !== undefined) test.randomize = randomize;
    if (questions !== undefined) test.questions = questions.map(id => new mongoose.Types.ObjectId(id)) || [];
    if (questionMarks !== undefined) test.questionMarks = questionMarks;
    if (questionCount !== undefined) test.questionCount = parsedQuestionCount;
    if (totalMarks !== undefined) test.totalMarks = parsedTotalMarks;
    await test.save();
    console.log('Test updated:', { testId: test._id, status: test.status, questionCount: test.questions.length, totalMarks, questionMarks });
    res.json(test);
  } catch (error) {
    console.error('Test update error:', {
      error: error.message,
      request: req.body,
      stack: error.stack
    });
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: `Validation failed: ${errors.join(', ')}` });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Teacher adds or updates questions for a test
router.put('/:id/questions', auth, teacherOnly, async (req, res) => {
  try {
    const { questions, questionMarks } = req.body;
    console.log('Updating questions:', { id: req.params.id, user: req.user.username, questionCount: questions?.length, questions: questions?.map(id => id.toString()), questionMarks });
    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log('Invalid test ID:', { id: req.params.id });
      return res.status(400).json({ error: 'Invalid test ID format.' });
    }
    const test = await Test.findById(req.params.id);
    if (!test) {
      console.log('Test not found:', { id: req.params.id });
      return res.status(404).json({ error: 'Test not found.' });
    }
    if (!req.user.subjects.some(sub => sub.subject === test.subject && sub.class === test.class)) {
      console.log('Not assigned:', { user: req.user.username, subject: test.subject, class: test.class });
      return res.status(403).json({ error: 'You are not assigned to this test\'s subject/class.' });
    }
    if (!Array.isArray(questions)) {
      console.log('Invalid questions format:', { questions });
      return res.status(400).json({ error: 'Questions must be an array.' });
    }
    if (questions.length > test.questionCount) {
      console.log('Too many questions:', { questionCount: test.questionCount, questionsLength: questions.length });
      return res.status(400).json({ error: `Number of questions (${questions.length}) exceeds question count (${test.questionCount}).` });
    }
    const questionDocs = await Question.find({ _id: { $in: questions.map(id => new mongoose.Types.ObjectId(id)) } });
    if (questionDocs.length !== questions.length) {
      console.log('Invalid question IDs:', { questions });
      return res.status(400).json({ error: 'One or more question IDs are invalid.' });
    }
    if (!questionDocs.every(q => q.subject === test.subject && q.class === test.class)) {
      console.log('Questions mismatch:', { subject: test.subject, class: test.class });
      return res.status(400).json({ error: 'Questions must match test subject and class.' });
    }
    if (!questionDocs.every(q => 
      Array.isArray(q.options) && 
      q.options.length > 0 && 
      q.options.every(opt => typeof opt === 'string' && opt.trim()) && 
      typeof q.text === 'string' && 
      q.text.trim() && 
      typeof q.correctAnswer === 'string' && 
      q.correctAnswer.trim()
    )) {
      console.log('Invalid question data:', {
        invalidQuestions: questionDocs
          .filter(q => 
            !Array.isArray(q.options) || 
            q.options.length === 0 || 
            !q.options.every(opt => typeof opt === 'string' && opt.trim()) || 
            typeof q.text !== 'string' || 
            !q.text.trim() || 
            typeof q.correctAnswer !== 'string' || 
            !q.correctAnswer.trim()
          )
          .map(q => ({ _id: q._id, text: q.text, options: q.options, correctAnswer: q.correctAnswer }))
      });
      return res.status(400).json({ error: 'All questions must have valid text, non-empty options array, and a correct answer.' });
    }
    if (!Array.isArray(questionMarks) || questionMarks.length !== questions.length) {
      console.log('Invalid questionMarks:', { questionMarks, expectedLength: questions.length });
      return res.status(400).json({ error: 'Question marks must be an array matching the number of questions.' });
    }
    const totalMarksSum = questionMarks.reduce((sum, mark) => sum + Number(mark), 0);
    if (totalMarksSum !== test.totalMarks) {
      console.log('Invalid total marks:', { totalMarksSum, expected: test.totalMarks });
      return res.status(400).json({ error: `Sum of question marks (${totalMarksSum}) must equal total marks (${test.totalMarks}).` });
    }
    test.questions = questions.map(id => new mongoose.Types.ObjectId(id));
    test.questionMarks = questionMarks;
    await test.save();
    console.log('Questions updated:', { testId: test._id, status: test.status, questionCount: questions.length, questionMarks });
    res.json(test);
  } catch (error) {
    console.error('Questions update error:', {
      error: error.message,
      request: req.body,
      stack: error.stack
    });
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: `Validation failed: ${errors.join(', ')}` });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a test
router.delete('/:testId', auth, async (req, res) => {
  try {
    console.log('Deleting test:', { 
      testId: req.params.testId, 
      user: req.user.username, 
      role: req.user.role, 
      userId: req.user.userId, 
      subjects: req.user.subjects 
    });
    if (!mongoose.isValidObjectId(req.params.testId)) {
      console.log('Invalid test ID:', { testId: req.params.testId });
      return res.status(400).json({ error: 'Invalid test ID format.' });
    }
    const test = await Test.findById(req.params.testId);
    if (!test) {
      console.log('Test not found:', { testId: req.params.testId });
      return res.status(404).json({ error: 'Test not found.' });
    }
    if (req.user.role !== 'admin') {
      if (!req.user.subjects.some(sub => sub.subject === test.subject && sub.class === test.class)) {
        console.log('Access denied - Not assigned:', { 
          user: req.user.username, 
          role: req.user.role, 
          subject: test.subject, 
          class: test.class 
        });
        return res.status(403).json({ error: 'Access restricted to test creator or admins.' });
      }
      if (test.status !== 'draft') {
        console.log('Cannot delete non-draft test:', { 
          testId: req.params.testId, 
          status: test.status 
        });
        return res.status(403).json({ error: 'Only draft tests can be deleted by non-admins.' });
      }
    }
    await Test.deleteOne({ _id: req.params.testId });
    await Result.deleteMany({ testId: req.params.testId });
    console.log('Deleted test and results:', { testId: req.params.testId });
    res.json({ message: 'Test and related results deleted successfully.' });
  } catch (error) {
    console.error('Delete error:', {
      error: error.message,
      testId: req.params.testId,
      user: req.user.username,
      role: req.user.role,
      stack: error.stack
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update test results
router.put('/results/:resultId', auth, adminOnly, async (req, res) => {
  try {
    const { score, answers, correctness } = req.body;
    console.log('Updating result:', { resultId: req.params.resultId, user: req.user.username });
    if (!mongoose.isValidObjectId(req.params.resultId)) {
      console.log('Invalid result ID:', { resultId: req.params.resultId });
      return res.status(400).json({ error: 'Invalid result ID format.' });
    }
    const result = await Result.findById(req.params.resultId);
    if (!result) {
      console.log('Result not found:', { resultId: req.params.resultId });
      return res.status(404).json({ error: 'Result not found.' });
    }
    if (score !== undefined) {
      if (isNaN(score) || score < 0 || score > result.totalMarks) {
        console.log('Invalid score:', { score, totalMarks: result.totalMarks });
        return res.status(400).json({ error: 'Score must be a number between 0 and total marks.' });
      }
      result.score = score;
    }
    if (answers !== undefined) {
      if (typeof answers !== 'object' || answers === null) {
        console.log('Invalid answers:', { answers });
        return res.status(400).json({ error: 'Answers must be an object.' });
      }
      result.answers = answers;
    }
    if (correctness !== undefined) {
      if (typeof correctness !== 'object' || correctness === null) {
        console.log('Invalid correctness:', { correctness });
        return res.status(400).json({ error: 'Correctness must be an object.' });
      }
      result.correctness = correctness;
    }
    await result.save();
    console.log('Result updated:', { resultId: result._id });
    res.json(result);
  } catch (error) {
    console.error('Result update error:', {
      error: error.message,
      resultId: req.params.resultId,
      stack: error.stack
    });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;