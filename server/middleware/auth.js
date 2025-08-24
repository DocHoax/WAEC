const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log('Auth middleware - Token:', token ? 'Present' : 'Missing');
  if (!token) {
    console.log('Auth middleware - No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Decoded:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('Auth middleware - Error:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  console.log('AdminOnly middleware - User role:', req.user?.role);
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const teacherOnly = (req, res, next) => {
  console.log('TeacherOnly middleware - User role:', req.user?.role);
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Teacher access required' });
  }
  next();
};

module.exports = { 
  auth, 
  adminOnly, 
  teacherOnly 
};