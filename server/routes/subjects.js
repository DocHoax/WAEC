const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    console.log('Subjects route - Fetching subjects:', { user: req.user.username });
    const classes = await Class.find({}, 'subjects');
    const subjects = [...new Set(classes.flatMap(cls => cls.subjects))].filter(subject => subject);
    console.log('Subjects route - Success:', { count: subjects.length });
    res.json(subjects);
  } catch (error) {
    console.error('Subjects route - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;