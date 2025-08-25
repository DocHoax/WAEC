const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    console.log('GET /api/sessions - Request:', { url: req.url });
    const sessions = await Session.find();
    res.json(sessions);
  } catch (error) {
    console.error('GET /api/sessions - Error:', { message: error.message, stack: error.stack, url: req.url });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    console.log('POST /api/sessions - Request:', { body: req.body, url: req.url });
    const { sessionName, isActive } = req.body;
    if (!sessionName) return res.status(400).json({ error: 'Session name is required' });
    if (!sessionName.match(/^\d{4}\/\d{4} (First|Second|Third) Term$/)) {
      return res.status(400).json({ error: 'Session must be in format YYYY/YYYY First/Second/Third Term' });
    }
    const session = new Session({ sessionName, isActive });
    await session.save();
    res.status(201).json({ message: 'Session created', session });
  } catch (error) {
    console.error('POST /api/sessions - Error:', { message: error.message, stack: error.stack, url: req.url });
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ CORRECTED - Removed regex pattern from route path
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    console.log('PUT /api/sessions/:id - Request:', { id: req.params.id, body: req.body, url: req.url });
    const { sessionName, isActive } = req.body;
    if (!sessionName) return res.status(400).json({ error: 'Session name is required' });
    if (!sessionName.match(/^\d{4}\/\d{4} (First|Second|Third) Term$/)) {
      return res.status(400).json({ error: 'Session must be in format YYYY/YYYY First/Second/Third Term' });
    }
    const session = await Session.findById(req.params.id);
    if (!session) {
      console.log('PUT /api/sessions/:id - Session not found:', { id: req.params.id });
      return res.status(404).json({ error: 'Session not found' });
    }
    session.sessionName = sessionName;
    session.isActive = isActive;
    await session.save();
    res.json({ message: 'Session updated', session });
  } catch (error) {
    console.error('PUT /api/sessions/:id - Error:', { message: error.message, stack: error.stack, id: req.params.id, url: req.url });
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ CORRECTED - Removed regex pattern from route path
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    console.log('DELETE /api/sessions/:id - Request:', { id: req.params.id, url: req.url });
    const session = await Session.findByIdAndDelete(req.params.id);
    if (!session) {
      console.log('DELETE /api/sessions/:id - Session not found:', { id: req.params.id });
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ message: 'Session deleted' });
  } catch (error) {
    console.error('DELETE /api/sessions/:id - Error:', { message: error.message, stack: error.stack, id: req.params.id, url: req.url });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;