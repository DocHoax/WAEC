const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

const router = express.Router();

// Input validation middleware
const validateUserInput = (req, res, next) => {
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !role) {
    return res.status(400).json({ message: 'Name, email, and role are required' });
  }
  
  if (req.method === 'POST' && !password) {
    return res.status(400).json({ message: 'Password is required for new users' });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  
  // Validate role
  const validRoles = ['super_admin', 'admin', 'teacher', 'student'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role specified' });
  }
  
  next();
};

// Get all permissions (for Super Admin only)
router.get('/permissions', auth, async (req, res) => {
  try {
    // Only super admin can access all permissions
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied. Super admin access required.' });
    }

    const permissions = await Permission.find().sort({ category: 1, name: 1 });
    
    res.json({
      permissions,
      count: permissions.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ message: 'Server error fetching permissions' });
  }
});

// Get all users with pagination and filtering
router.get('/', auth, checkPermission('view_users'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      role, 
      active,
      search 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (role) filter.role = role;
    if (active !== undefined) filter.active = active === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('class', 'name level')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// Get user by ID
router.get('/:id', auth, checkPermission('view_users'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('class', 'name level')
      .populate('permissions');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Regular admins cannot view super_admin details
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied to super admin details' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

// Create new user (admin only)
router.post('/', auth, checkPermission('create_users'), validateUserInput, async (req, res) => {
  const session = await User.startSession();
  session.startTransaction();

  try {
    const { name, email, password, role, studentId, class: classId, permissions, active = true } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Prevent creating super_admin users unless current user is super_admin
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Cannot create super admin users' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      studentId,
      class: classId,
      active,
      createdBy: req.user.id
    });

    await user.save({ session });


   // Create admin with specific permissions (Super Admin only)
router.post('/admin', auth, async (req, res) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    // Only super admin can create other admins
    if (req.user.role !== 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ 
        message: 'Access denied. Super admin access required to create administrators.' 
      });
    }

    const { name, email, password, adminPermissions = [] } = req.body;

    if (!name || !email || !password) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Validate admin permissions
    const validAdminPermissions = [
      'MANAGE_USERS',
      'APPROVE_TESTS', 
      'MANAGE_RESULTS',
      'SYSTEM_CONFIG',
      'VIEW_ANALYTICS',
      'MANAGE_ADMINS'
    ];

    const invalidPermissions = adminPermissions.filter(perm => 
      !validAdminPermissions.includes(perm)
    );

    if (invalidPermissions.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'Invalid admin permissions provided',
        invalidPermissions 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin user
    const adminUser = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      adminPermissions,
      active: true,
      createdBy: req.user.id
    });

    await adminUser.save({ session });
    await session.commitTransaction();
    session.endSession();

    // Return admin without password
    const adminResponse = await User.findById(adminUser._id)
      .select('-password');

    res.status(201).json({
      message: 'Administrator created successfully',
      admin: adminResponse
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
   
    console.error('Create admin error:', error);
   
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
   
    res.status(500).json({ message: 'Server error creating administrator' });
  }
});

// Update admin permissions (Super Admin only)
router.put('/admin/:id/permissions', auth, async (req, res) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    // Only super admin can update admin permissions
    if (req.user.role !== 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ 
        message: 'Access denied. Super admin access required to update admin permissions.' 
      });
    }

    const { adminPermissions } = req.body;
    const adminId = req.params.id;

    if (!adminPermissions || !Array.isArray(adminPermissions)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Admin permissions array is required' });
    }

    // Validate admin permissions
    const validAdminPermissions = [
      'MANAGE_USERS',
      'APPROVE_TESTS', 
      'MANAGE_RESULTS',
      'SYSTEM_CONFIG',
      'VIEW_ANALYTICS',
      'MANAGE_ADMINS'
    ];

    const invalidPermissions = adminPermissions.filter(perm => 
      !validAdminPermissions.includes(perm)
    );

    if (invalidPermissions.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'Invalid admin permissions provided',
        invalidPermissions 
      });
    }

    const adminUser = await User.findById(adminId).session(session);
   
    if (!adminUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Admin user not found' });
    }

    // Ensure we're only updating admin users
    if (adminUser.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'User is not an administrator' });
    }

    // Update admin permissions
    adminUser.adminPermissions = adminPermissions;
    adminUser.updatedBy = req.user.id;

    await adminUser.save({ session });
    await session.commitTransaction();
    session.endSession();

    // Return updated admin
    const updatedAdmin = await User.findById(adminId)
      .select('-password');

    res.json({
      message: 'Admin permissions updated successfully',
      admin: updatedAdmin
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
   
    console.error('Update admin permissions error:', error);
    res.status(500).json({ message: 'Server error updating admin permissions' });
  }
});
 
    // For non-super_admin roles, assign permissions if provided
    if (role !== 'super_admin' && permissions && permissions.length > 0) {
      // Validate permissions exist
      const validPermissions = await Permission.find({
        _id: { $in: permissions }
      }).session(session);

      if (validPermissions.length !== permissions.length) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'One or more invalid permissions' });
      }

      const permissionAssignments = permissions.map(permissionId => ({
        userId: user._id,
        permissionId: permissionId
      }));

      await RolePermission.insertMany(permissionAssignments, { session });
    }

    await session.commitTransaction();
    session.endSession();

    // Return user without password
    const userResponse = await User.findById(user._id)
      .select('-password')
      .populate('class', 'name level');

    res.status(201).json({ 
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Create user error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User with this email or student ID already exists' });
    }
    
    res.status(500).json({ message: 'Server error creating user' });
  }
});

// Update user (admin only)
router.put('/:id', auth, checkPermission('edit_users'), async (req, res) => {
  const session = await User.startSession();
  session.startTransaction();

  try {
    const { name, email, role, studentId, class: classId, active, permissions } = req.body;
    
    const user = await User.findById(req.params.id).session(session);
    
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent modifying super_admin users unless current user is super_admin
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Cannot modify super admin users' });
    }

    // Prevent role escalation
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Cannot assign super admin role' });
    }

    // Update user fields
    const updateFields = { name, email, role, studentId, class: classId, active };
    Object.keys(updateFields).forEach(key => {
      if (updateFields[key] !== undefined) {
        user[key] = updateFields[key];
      }
    });

    await user.save({ session });

    // Update permissions if provided (for non-super_admin roles)
    if (role !== 'super_admin' && permissions) {
      // Remove existing permissions
      await RolePermission.deleteMany({ userId: user._id }).session(session);
      
      // Add new permissions
      if (permissions.length > 0) {
        const permissionAssignments = permissions.map(permissionId => ({
          userId: user._id,
          permissionId: permissionId
        }));
        await RolePermission.insertMany(permissionAssignments, { session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    // Return updated user
    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('class', 'name level');

    res.json({ 
      message: 'User updated successfully', 
      user: updatedUser 
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Update user error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User with this email or student ID already exists' });
    }
    
    res.status(500).json({ message: 'Server error updating user' });
  }
});

// Delete user (admin only)
router.delete('/:id', auth, checkPermission('delete_users'), async (req, res) => {
  const session = await User.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(req.params.id).session(session);
    
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting super_admin users
    if (user.role === 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Cannot delete super admin users' });
    }

    // Prevent users from deleting themselves
    if (user._id.toString() === req.user.id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Delete user and their permissions
    await User.findByIdAndDelete(req.params.id).session(session);
    await RolePermission.deleteMany({ userId: req.params.id }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

// Get current user profile
router.get('/profile/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('class', 'name level')
      .populate('permissions');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Update current user profile
router.put('/profile/me', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ 
      message: 'Profile updated successfully', 
      user 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

module.exports = router;