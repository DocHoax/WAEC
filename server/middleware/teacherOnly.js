module.exports = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    console.error('TeacherOnly middleware - Access denied:', req.user);
    return res.status(403).json({ error: 'Teacher access required' });
  }
  console.log('TeacherOnly middleware - Access granted:', req.user);
  next();
};