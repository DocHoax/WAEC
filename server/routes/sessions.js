const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const sessions = await Session.find();
    res.json(sessions);
  } catch (error) {
    console.error('Sessions route - Fetch error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { sessionName, isActive } = req.body;
    if (!sessionName) return res.status(400).json({ error: 'Session name is required' });
    if (!sessionName.match(/^\d{4}\/\d{4} (First|Second|Third) Term$/)) {
      return res.status(400).json({ error: 'Session must be in format YYYY/YYYY First/Second/Third Term' });
    }
    const session = new Session({ sessionName, isActive });
    await session.save();
    res.status(201).json({ message: 'Session created', session });
  } catch (error) {
    console.error('Sessions route - Create error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { sessionName, isActive } = req.body;
    if (!sessionName) return res.status(400).json({ error: 'Session name is required' });
    if (!sessionName.match(/^\d{4}\/\d{4} (First|Second|Third) Term$/)) {
      return res.status(400).json({ error: 'Session must be in format YYYY/YYYY First/Second/Third Term' });
    }
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    session.sessionName = sessionName;
    session.isActive = isActive;
    await session.save();
    res.json({ message: 'Session updated', session });
  } catch (error) {
    console.error('Sessions route - Update error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const session = await Session.findByIdAndDelete(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'Session deleted' });
  } catch (error) {
    console.error('Sessions route - Delete error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;