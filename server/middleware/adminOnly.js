module.exports = (req, res, next) => {
  if (req.user.role !== 'admin') {
    console.error('AdminOnly middleware - Access denied:', req.user);
    return res.status(403).json({ error: 'Admin access required' });
  }
  console.log('AdminOnly middleware - Access granted:', req.user);
  next();
};