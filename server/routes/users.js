const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

const router = express.Router();

// Get all permissions (for Super Admin only)
router.get('/permissions', auth, async (req, res) => {
  try {
    // Only super admin can access all permissions
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const permissions = await Permission.find().sort({ category: 1, name: 1 });
    res.json(permissions);
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (admin only)
router.get('/', auth, checkPermission('view_users'), async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('class');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user (admin only)
router.post('/', auth, checkPermission('create_users'), async (req, res) => {
  try {
    const { name, email, password, role, studentId, class: classId, permissions } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      studentId,
      class: classId
    });

    await user.save();

    // For non-super_admin roles, assign permissions if provided
    if (role !== 'super_admin' && permissions && permissions.length > 0) {
      const permissionAssignments = permissions.map(permissionName => ({
        role,
        permissionId: permissionName // This should be permission ID
      }));

      await RolePermission.insertMany(permissionAssignments);
    }

    res.status(201).json({ 
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:id', auth, checkPermission('edit_users'), async (req, res) => {
  try {
    const { name, email, role, studentId, class: classId, active } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, studentId, class: classId, active },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', auth, checkPermission('delete_users'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;