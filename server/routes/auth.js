const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RolePermission = require('../models/RolePermission');
const Permission = require('../models/Permission');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { Parser } = require('json2csv');
const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'Uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, and .png files are allowed'), false);
    }
  },
});

// Helper function to get user permissions
const getUserPermissions = async (role) => {
  if (role === 'super_admin') {
    return ['all_permissions']; // Special flag for super admin
  }
  
  const rolePermissions = await RolePermission.find({ role })
    .populate('permissionId');
  return rolePermissions.map(rp => rp.permissionId.name);
};

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('username name surname role class subjects enrolledSubjects blocked picture dateOfBirth address phoneNumber sex age');
    if (!user) {
      console.error('GET /api/auth/me - User not found:', req.user.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user permissions
    const permissions = await getUserPermissions(user.role);

    console.log('GET /api/auth/me - Success:', { userId: user._id, role: user.role });
    res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      surname: user.surname,
      role: user.role,
      class: user.class,
      subjects: user.subjects,
      enrolledSubjects: user.enrolledSubjects,
      blocked: user.blocked,
      picture: user.picture,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      phoneNumber: user.phoneNumber,
      sex: user.sex,
      age: user.age,
      permissions // Add permissions to response
    });
  } catch (error) {
    console.error('GET /api/auth/me - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.post('/register', auth, checkPermission('create_users'), upload.single('picture'), async (req, res) => {
  try {
    const { username, password, name, surname, role, class: className, subjects, dateOfBirth, address, phoneNumber, sex, age } = req.body;
    let parsedSubjects = [];
    try {
      parsedSubjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;
    } catch (err) {
      return res.status(400).json({ error: 'Invalid subjects format' });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      name,
      surname,
      role,
      class: className,
      subjects: role === 'teacher' ? parsedSubjects : [],
      enrolledSubjects: role === 'student' ? parsedSubjects : [],
      blocked: false,
      picture: req.file ? req.file.filename : '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address,
      phoneNumber,
      sex,
      age: age ? Number(age) : undefined,
    });
    await user.save();
    res.status(201).json({
      message: 'User created',
      user: {
        _id: user._id,
        username,
        name,
        surname,
        role,
        class: user.class,
        subjects: user.subjects,
        enrolledSubjects: user.enrolledSubjects,
        picture: user.picture,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        phoneNumber: user.phoneNumber,
        sex: user.sex,
        age: user.age,
      },
    });
  } catch (error) {
    console.error('POST /api/auth/register - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.post('/register/bulk', auth, checkPermission('create_users'), async (req, res) => {
  try {
    const { users } = req.body;
    let count = 0;
    for (const userData of users) {
      const { username, password, name, surname, role, class: className, subjects, picture } = userData;
      const existingUser = await User.findOne({ username });
      if (existingUser) continue;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        username,
        password: hashedPassword,
        name,
        surname,
        role,
        class: className,
        subjects: role === 'teacher' ? subjects : [],
        enrolledSubjects: role === 'student' ? subjects : [],
        blocked: false,
        picture: picture || '',
      });
      await user.save();
      count++;
    }
    res.status(201).json({ message: 'Bulk registration complete', count });
  } catch (error) {
    console.error('POST /api/auth/register/bulk - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      console.error('POST /api/auth/login - User not found:', username);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    if (user.blocked) {
      console.error('POST /api/auth/login - Account blocked:', username);
      return res.status(403).json({ error: 'Account blocked' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error('POST /api/auth/login - Password mismatch:', username);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Get user permissions
    const permissions = await getUserPermissions(user.role);

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
        class: user.class,
        subjects: user.subjects,
        enrolledSubjects: user.enrolledSubjects,
        permissions // Add permissions to token
      },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    console.log('POST /api/auth/login - Success:', { username, userId: user._id, role: user.role });
    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        surname: user.surname,
        role: user.role,
        class: user.class,
        subjects: user.subjects,
        enrolledSubjects: user.enrolledSubjects,
        picture: user.picture,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        phoneNumber: user.phoneNumber,
        sex: user.sex,
        age: user.age,
        permissions // Add permissions to user object
      },
    });
  } catch (error) {
    console.error('POST /api/auth/login - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.post('/refresh', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('username name surname role class subjects enrolledSubjects blocked picture dateOfBirth address phoneNumber sex age');
    if (!user) {
      console.error('POST /api/auth/refresh - User not found:', req.user.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.blocked) {
      console.error('POST /api/auth/refresh - Account blocked:', req.user.username);
      return res.status(403).json({ error: 'Account blocked' });
    }

    // Get user permissions
    const permissions = await getUserPermissions(user.role);

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
        class: user.class,
        subjects: user.subjects,
        enrolledSubjects: user.enrolledSubjects,
        permissions // Add permissions to token
      },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    console.log('POST /api/auth/refresh - Success:', { username: user.username, userId: user._id });
    res.json({ token });
  } catch (error) {
    console.error('POST /api/auth/refresh - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.get('/users', auth, checkPermission('view_users'), async (req, res) => {
  try {
    const users = await User.find({}, 'username name surname role class subjects enrolledSubjects blocked picture dateOfBirth address phoneNumber sex age');
    res.json(users);
  } catch (error) {
    console.error('GET /api/auth/users - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// ✅ CORRECTED - Removed regex patterns from route paths
router.get('/students/:subject/:class', auth, checkPermission('view_users'), async (req, res) => {
  try {
    console.log('GET /api/auth/students/:subject/:class - Request:', { params: req.params, url: req.url });
    const { subject, class: className } = req.params;
    if (!subject || !className) {
      console.log('GET /api/auth/students/:subject/:class - Missing subject or class:', { subject, class: className });
      return res.status(400).json({ error: 'Subject and class are required.' });
    }
    const students = await User.find({
      role: 'student',
      enrolledSubjects: { $elemMatch: { subject, class: className } },
    }).select('_id username name');
    console.log('GET /api/auth/students/:subject/:class - Students fetched:', { count: students.length });
    res.json(students);
  } catch (error) {
    console.error('GET /api/auth/students/:subject/:class - Error:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      params: req.params,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ CORRECTED - Removed regex patterns from route paths
router.put('/users/:id', auth, checkPermission('edit_users'), upload.single('picture'), async (req, res) => {
  try {
    const { username, password, name, surname, role, class: className, subjects, dateOfBirth, address, phoneNumber, sex, age } = req.body;
    let parsedSubjects = [];
    try {
      parsedSubjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;
    } catch (err) {
      return res.status(400).json({ error: 'Invalid subjects format' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) return res.status(400).json({ error: 'Username exists' });
    }
    user.username = username || user.username;
    if (password) user.password = await bcrypt.hash(password, 10);
    user.name = name || user.name;
    user.surname = surname || user.surname;
    user.role = role || user.role;
    user.class = className || user.class;
    user.subjects = role === 'teacher' ? parsedSubjects : user.subjects;
    user.enrolledSubjects = role === 'student' ? parsedSubjects : user.enrolledSubjects;
    user.picture = req.file ? req.file.filename : user.picture;
    user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : user.dateOfBirth;
    user.address = address || user.address;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.sex = sex || user.sex;
    user.age = age ? Number(age) : user.age;
    await user.save();
    res.json({
      message: 'User updated',
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        surname: user.surname,
        role: user.role,
        class: user.class,
        subjects: user.subjects,
        enrolledSubjects: user.enrolledSubjects,
        picture: user.picture,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        phoneNumber: user.phoneNumber,
        sex: user.sex,
        age: user.age,
      },
    });
  } catch (error) {
    console.error('PUT /api/auth/users/:id - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// ✅ CORRECTED - Removed regex patterns from route paths
router.put('/users/:id/block', auth, checkPermission('edit_users'), async (req, res) => {
  try {
    const { blocked } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.blocked = blocked;
    await user.save();
    res.json({ message: 'User block status updated', user: { _id: user._id, blocked: user.blocked } });
  } catch (error) {
    console.error('PUT /api/auth/users/:id/block - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// ✅ CORRECTED - Removed regex patterns from route paths
router.delete('/users/:id', auth, checkPermission('delete_users'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('DELETE /api/auth/users/:id - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.get('/export/students', auth, checkPermission('view_users'), async (req, res) => {
  try {
    const users = await User.find({ role: 'student' });
    const fields = ['username', 'name', 'surname', 'class', 'enrolledSubjects', 'picture', 'dateOfBirth', 'address', 'phoneNumber', 'sex', 'age'];
    const csv = new Parser({ fields }).parse(users.map(u => ({
      username: u.username,
      name: u.name,
      surname: u.surname,
      class: u.class || 'N/A',
      enrolledSubjects: u.enrolledSubjects.map(s => `${s.subject} (${s.class})`).join(', ') || 'None',
      picture: u.picture || 'None',
      dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString() : 'N/A',
      address: u.address || 'N/A',
      phoneNumber: u.phoneNumber || 'N/A',
      sex: u.sex || 'N/A',
      age: u.age || 'N/A',
    })));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=students.csv');
    res.send(csv);
  } catch (error) {
    console.error('GET /api/auth/export/students - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;