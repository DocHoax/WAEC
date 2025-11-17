const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Cache configuration
let subjectsCache = {
  data: null,
  lastUpdated: null,
  ttl: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
};

// Get all unique subjects
router.get('/', auth, checkPermission('view_subjects'), async (req, res) => {
  try {
    console.log('Subjects route - Fetching subjects:', { 
      user: req.user.username,
      role: req.user.role 
    });

    // Check cache first
    if (subjectsCache.data && subjectsCache.lastUpdated && 
        (Date.now() - subjectsCache.lastUpdated) < subjectsCache.ttl) {
      console.log('Subjects route - Returning cached data');
      return res.json(subjectsCache.data);
    }

    const classes = await Class.find({}, 'subjects name level').lean();
    
    // Process subjects with additional context
    const subjectSet = new Set();
    const subjectsWithContext = [];

    classes.forEach(cls => {
      if (cls.subjects && Array.isArray(cls.subjects)) {
        cls.subjects.forEach(subject => {
          if (subject && typeof subject === 'string') {
            const trimmedSubject = subject.trim();
            if (trimmedSubject && !subjectSet.has(trimmedSubject.toLowerCase())) {
              subjectSet.add(trimmedSubject.toLowerCase());
              subjectsWithContext.push({
                name: trimmedSubject,
                classes: [cls.name], // Initial class
                levels: [cls.level] // Initial level
              });
            } else if (trimmedSubject) {
              // Add to existing subject's context
              const existingSubject = subjectsWithContext.find(
                s => s.name.toLowerCase() === trimmedSubject.toLowerCase()
              );
              if (existingSubject) {
                if (!existingSubject.classes.includes(cls.name)) {
                  existingSubject.classes.push(cls.name);
                }
                if (cls.level && !existingSubject.levels.includes(cls.level)) {
                  existingSubject.levels.push(cls.level);
                }
              }
            }
          }
        });
      }
    });

    // Sort subjects alphabetically
    subjectsWithContext.sort((a, b) => a.name.localeCompare(b.name));

    // Update cache
    subjectsCache = {
      data: subjectsWithContext,
      lastUpdated: Date.now(),
      ttl: 24 * 60 * 60 * 1000
    };

    console.log('Subjects route - Success:', { 
      count: subjectsWithContext.length,
      cached: true 
    });

    res.json(subjectsWithContext);
  } catch (error) {
    console.error('Subjects route - Error:', { 
      error: error.message,
      user: req.user.username 
    });
    res.status(500).json({ 
      error: 'Server error fetching subjects',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Clear subjects cache (admin only)
router.delete('/cache', auth, checkPermission('manage_subjects'), async (req, res) => {
  try {
    subjectsCache = {
      data: null,
      lastUpdated: null,
      ttl: 24 * 60 * 60 * 1000
    };
    
    console.log('Subjects cache cleared by:', req.user.username);
    res.json({ message: 'Subjects cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing subjects cache:', error);
    res.status(500).json({ error: 'Server error clearing cache' });
  }
});

// Get subjects by class level
router.get('/level/:level', auth, checkPermission('view_subjects'), async (req, res) => {
  try {
    const { level } = req.params;
    
    const classes = await Class.find({ level }, 'subjects name').lean();
    const subjects = [...new Set(classes.flatMap(cls => cls.subjects))]
      .filter(subject => subject)
      .sort();

    res.json({
      level,
      subjects,
      classCount: classes.length
    });
  } catch (error) {
    console.error('Error fetching subjects by level:', error);
    res.status(500).json({ error: 'Server error fetching subjects by level' });
  }
});

module.exports = router;